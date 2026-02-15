import { create } from 'zustand';

import type { Reminder, ReminderInsert, SyncStatus } from '@/types/reminder';
import * as repo from '@/lib/reminder-repository';

interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  todayCount: number;
  upcomingCount: number;
  completedCount: number;

  loadReminders: (ownerId: string) => Promise<void>;
  loadCounts: (ownerId: string) => Promise<void>;
  createReminder: (data: ReminderInsert, isGuest: boolean) => Promise<Reminder>;
  updateReminder: (id: string, updates: Partial<Reminder>, isGuest: boolean) => Promise<void>;
  deleteReminder: (id: string, isGuest: boolean) => Promise<void>;
  toggleComplete: (id: string, isGuest: boolean) => Promise<void>;
  clearAll: () => void;
  refreshFromDb: (ownerId: string) => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  isLoading: false,
  todayCount: 0,
  upcomingCount: 0,
  completedCount: 0,

  loadReminders: async (ownerId: string) => {
    set({ isLoading: true });
    const reminders = await repo.getAllReminders(ownerId);
    set({ reminders, isLoading: false });
    await get().loadCounts(ownerId);
  },

  loadCounts: async (ownerId: string) => {
    const [todayCount, upcomingCount, completedCount] = await Promise.all([
      repo.getTodayCount(ownerId),
      repo.getUpcomingCount(ownerId),
      repo.getCompletedCount(ownerId),
    ]);
    set({ todayCount, upcomingCount, completedCount });
  },

  createReminder: async (data: ReminderInsert, isGuest: boolean) => {
    const syncStatus: SyncStatus = isGuest ? 'synced' : 'pending_create';
    const reminder = await repo.createReminder(data, syncStatus);
    set((state) => ({ reminders: [reminder, ...state.reminders] }));
    await get().loadCounts(data.owner_id);
    return reminder;
  },

  updateReminder: async (id: string, updates: Partial<Reminder>, isGuest: boolean) => {
    const syncStatus: SyncStatus = isGuest ? 'synced' : 'pending_update';
    const updated = await repo.updateReminder(id, updates, syncStatus);
    if (updated) {
      set((state) => ({
        reminders: state.reminders.map((r) => (r.id === id ? updated : r)),
      }));
      await get().loadCounts(updated.owner_id);
    }
  },

  deleteReminder: async (id: string, isGuest: boolean) => {
    if (isGuest) {
      await repo.deleteReminder(id, false);
    } else {
      await repo.deleteReminder(id, true);
    }
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));
  },

  toggleComplete: async (id: string, isGuest: boolean) => {
    const syncStatus: SyncStatus = isGuest ? 'synced' : 'pending_update';
    const updated = await repo.toggleComplete(id, syncStatus);
    if (updated) {
      set((state) => ({
        reminders: state.reminders.map((r) => (r.id === id ? updated : r)),
      }));
      await get().loadCounts(updated.owner_id);
    }
  },

  clearAll: () => {
    set({ reminders: [], todayCount: 0, upcomingCount: 0, completedCount: 0 });
  },

  refreshFromDb: async (ownerId: string) => {
    const reminders = await repo.getAllReminders(ownerId);
    set({ reminders });
    await get().loadCounts(ownerId);
  },
}));
