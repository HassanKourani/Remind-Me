import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reminderRepository } from '@/repositories/reminderRepository';
import { notificationScheduler } from '@/services/notifications/scheduler';
import { useAuthStore } from '@/stores/authStore';
import { CreateReminderInput, UpdateReminderInput, Reminder } from '@/types/database';
import { addToSyncQueue, processSyncQueue, isConnected, isGuestUser } from '@/services/sync/syncService';
import { startGeofencing, stopGeofencing } from '@/services/location/geofencing';

// Helper: queue sync + process immediately if online
async function syncReminderToCloud(
  userId: string, reminderId: string,
  operation: 'create' | 'update' | 'delete',
  data: Record<string, unknown>
) {
  if (isGuestUser(userId)) return;
  try {
    await addToSyncQueue('reminder', reminderId, operation, data, userId);
    const connected = await isConnected();
    if (connected) await processSyncQueue(userId);
  } catch (error) {
    console.error('Sync error (queued for retry):', error);
  }
}

// --- QUERY HOOKS ---

export function useReminders() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: () => reminderRepository.getAll(user!.id),
    enabled: !!user,
  });
}

export function useActiveReminders() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['reminders', 'active', user?.id],
    queryFn: () => reminderRepository.getActive(user!.id),
    enabled: !!user,
  });
}

export function useTodayReminders() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['reminders', 'today', user?.id],
    queryFn: () => reminderRepository.getToday(user!.id),
    enabled: !!user,
  });
}

export function useReminder(id: string) {
  return useQuery({
    queryKey: ['reminder', id],
    queryFn: () => reminderRepository.getById(id),
    enabled: !!id,
  });
}

export function useReminderCount() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['reminders', 'count', user?.id],
    queryFn: () => reminderRepository.countActive(user!.id),
    enabled: !!user,
  });
}

export function useCompletedTodayCount() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['reminders', 'completedToday', user?.id],
    queryFn: () => reminderRepository.countCompletedToday(user!.id),
    enabled: !!user,
  });
}

// --- MUTATION HOOKS ---

export function useCreateReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (input: CreateReminderInput) => {
      const reminder = await reminderRepository.create(user!.id, input);

      // Schedule notification for time-based reminders
      if (reminder.type === 'time' && reminder.triggerAt) {
        const notificationId = await notificationScheduler.scheduleReminder(reminder);
        if (notificationId) {
          await reminderRepository.updateNotificationId(reminder.id, notificationId);
          reminder.notificationId = notificationId;
        }
      }

      // Register geofence for location-based reminders
      if (reminder.type === 'location' && reminder.latitude != null && reminder.longitude != null) {
        try {
          await startGeofencing(
            reminder.id,
            reminder.latitude,
            reminder.longitude,
            reminder.radius ?? 200,
            reminder.triggerOn ?? 'enter'
          );
        } catch (error) {
          console.error('[Geofencing] Failed to start:', error);
        }
      }

      // Sync to cloud
      await syncReminderToCloud(user!.id, reminder.id, 'create', {
        title: reminder.title, notes: reminder.notes, type: reminder.type,
        triggerAt: reminder.triggerAt, recurrenceRule: reminder.recurrenceRule,
        latitude: reminder.latitude, longitude: reminder.longitude,
        radius: reminder.radius, locationName: reminder.locationName,
        triggerOn: reminder.triggerOn, isRecurringLocation: reminder.isRecurringLocation,
        deliveryMethod: reminder.deliveryMethod, alarmSound: reminder.alarmSound,
        shareContactName: reminder.shareContactName, shareContactPhone: reminder.shareContactPhone,
        shareMessageTemplate: reminder.shareMessageTemplate, categoryId: reminder.categoryId,
        priority: reminder.priority, isCompleted: reminder.isCompleted,
        isActive: reminder.isActive, completedAt: reminder.completedAt,
        isDeleted: reminder.isDeleted,
      });

      return reminder;
    },
    onMutate: async (input: CreateReminderInput) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      const previousReminders = queryClient.getQueryData<Reminder[]>(['reminders', user?.id]);

      const optimisticReminder: Partial<Reminder> = {
        id: `optimistic_${Date.now()}`,
        userId: user!.id,
        title: input.title,
        notes: input.notes ?? null,
        type: input.type,
        triggerAt: input.triggerAt ?? null,
        isCompleted: false,
        isActive: true,
        priority: input.priority ?? 'medium',
        categoryId: input.categoryId ?? null,
        deliveryMethod: input.deliveryMethod ?? 'notification',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Reminder[]>(['reminders', user?.id], (old) =>
        old ? [optimisticReminder as Reminder, ...old] : [optimisticReminder as Reminder]
      );

      return { previousReminders };
    },
    onError: (_err, _input, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(['reminders', user?.id], context.previousReminders);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      // Cancel notification / stop geofence first
      const existing = await reminderRepository.getById(id);
      if (existing?.notificationId) {
        await notificationScheduler.cancelReminder(existing.notificationId);
      }
      if (existing?.geofenceId) {
        try { await stopGeofencing(id); } catch {}
      }
      const reminder = await reminderRepository.complete(id);

      // Sync to cloud
      await syncReminderToCloud(user!.id, id, 'update', {
        isCompleted: reminder.isCompleted,
        isActive: reminder.isActive,
        completedAt: reminder.completedAt,
      });

      return reminder;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });

      const previousActive = queryClient.getQueryData<Reminder[]>(['reminders', 'active', user?.id]);
      const previousToday = queryClient.getQueryData<Reminder[]>(['reminders', 'today', user?.id]);
      const previousAll = queryClient.getQueryData<Reminder[]>(['reminders', user?.id]);

      const now = new Date().toISOString();
      const markComplete = (reminders: Reminder[] | undefined) =>
        reminders?.map((r) =>
          r.id === id ? { ...r, isCompleted: true, isActive: false, completedAt: now } : r
        );

      queryClient.setQueryData<Reminder[]>(['reminders', 'active', user?.id], (old) =>
        old?.filter((r) => r.id !== id)
      );
      queryClient.setQueryData<Reminder[]>(['reminders', 'today', user?.id], markComplete);
      queryClient.setQueryData<Reminder[]>(['reminders', user?.id], markComplete);
      queryClient.setQueryData<Reminder>(['reminder', id], (old) =>
        old ? { ...old, isCompleted: true, isActive: false, completedAt: now } : old
      );

      return { previousActive, previousToday, previousAll };
    },
    onError: (_err, _id, context) => {
      if (context?.previousActive) {
        queryClient.setQueryData(['reminders', 'active', user?.id], context.previousActive);
      }
      if (context?.previousToday) {
        queryClient.setQueryData(['reminders', 'today', user?.id], context.previousToday);
      }
      if (context?.previousAll) {
        queryClient.setQueryData(['reminders', user?.id], context.previousAll);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useUncompleteReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const reminder = await reminderRepository.uncomplete(id);

      // Sync to cloud
      await syncReminderToCloud(user!.id, id, 'update', {
        isCompleted: reminder.isCompleted,
        isActive: reminder.isActive,
        completedAt: reminder.completedAt,
      });

      return reminder;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      // Cancel notification / stop geofence if scheduled
      const existing = await reminderRepository.getById(id);
      if (existing?.notificationId) {
        await notificationScheduler.cancelReminder(existing.notificationId);
      }
      if (existing?.geofenceId) {
        try { await stopGeofencing(id); } catch {}
      }
      await reminderRepository.delete(id);

      // Sync to cloud
      await syncReminderToCloud(user!.id, id, 'delete', {});
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });

      const previousAll = queryClient.getQueryData<Reminder[]>(['reminders', user?.id]);
      const previousActive = queryClient.getQueryData<Reminder[]>(['reminders', 'active', user?.id]);
      const previousToday = queryClient.getQueryData<Reminder[]>(['reminders', 'today', user?.id]);

      const removeById = (reminders: Reminder[] | undefined) =>
        reminders?.filter((r) => r.id !== id);

      queryClient.setQueryData<Reminder[]>(['reminders', user?.id], removeById);
      queryClient.setQueryData<Reminder[]>(['reminders', 'active', user?.id], removeById);
      queryClient.setQueryData<Reminder[]>(['reminders', 'today', user?.id], removeById);

      return { previousAll, previousActive, previousToday };
    },
    onError: (_err, _id, context) => {
      if (context?.previousAll) {
        queryClient.setQueryData(['reminders', user?.id], context.previousAll);
      }
      if (context?.previousActive) {
        queryClient.setQueryData(['reminders', 'active', user?.id], context.previousActive);
      }
      if (context?.previousToday) {
        queryClient.setQueryData(['reminders', 'today', user?.id], context.previousToday);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useRestoreReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      await reminderRepository.restore(id);

      // Sync to cloud
      await syncReminderToCloud(user!.id, id, 'update', {
        isDeleted: false,
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateReminderInput }) => {
      const reminder = await reminderRepository.update(id, input);

      // Sync to cloud (send updated fields)
      await syncReminderToCloud(user!.id, id, 'update', {
        ...input,
      });

      return reminder;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}
