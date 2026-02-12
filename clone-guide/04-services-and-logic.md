# 04 - Services, Repositories, Hooks & Business Logic

## Architecture Overview

```
Screen (app/) → Hook (src/hooks/) → Repository (src/repositories/) → SQLite
                                   → Sync Service → Supabase (async)
```

All reads come from SQLite. All writes go to SQLite first, then queue for cloud sync.

---

## 1. Reminder Repository

The data access layer. All CRUD goes through here.

```typescript
// src/repositories/reminderRepository.ts
import { getDatabase } from '@/services/database/sqlite';
import { Reminder, CreateReminderInput, UpdateReminderInput } from '@/types/database';
import { mapReminderFromDb, mapReminderToDb } from '@/lib/mappers';
import { generateId } from '@/lib/utils';

export const reminderRepository = {
  async getAll(userId: string, limit = 50, offset = 0): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders WHERE user_id = ? AND is_deleted = 0
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows.map(mapReminderFromDb);
  },

  async getActive(userId: string, limit = 50, offset = 0): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders
       WHERE user_id = ? AND is_deleted = 0 AND is_active = 1 AND is_completed = 0
       ORDER BY CASE WHEN type = 'time' THEN trigger_at ELSE created_at END ASC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows.map(mapReminderFromDb);
  },

  async getToday(userId: string, limit = 50, offset = 0): Promise<Reminder[]> {
    const db = await getDatabase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders
       WHERE user_id = ? AND is_deleted = 0 AND type = 'time'
         AND ((trigger_at >= ? AND trigger_at < ?)
           OR (completed_at >= ? AND completed_at < ?))
       ORDER BY is_completed ASC,
         CASE WHEN is_completed = 0 THEN trigger_at ELSE completed_at END ASC
       LIMIT ? OFFSET ?`,
      [userId, today.toISOString(), tomorrow.toISOString(), today.toISOString(), tomorrow.toISOString(), limit, offset]
    );
    return rows.map(mapReminderFromDb);
  },

  async getById(id: string): Promise<Reminder | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM reminders WHERE id = ? AND is_deleted = 0`, [id]
    );
    return row ? mapReminderFromDb(row) : null;
  },

  // Search reminders by title or notes content
  async search(userId: string, query: string, limit = 50): Promise<Reminder[]> {
    const db = await getDatabase();
    const pattern = `%${query}%`;
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders
       WHERE user_id = ? AND is_deleted = 0
         AND (title LIKE ? OR notes LIKE ?)
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, pattern, pattern, limit]
    );
    return rows.map(mapReminderFromDb);
  },

  async create(userId: string, input: CreateReminderInput): Promise<Reminder> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    // IMPORTANT: Use nullish coalescing (??) instead of logical OR (||) for all fields.
    // || treats 0 as falsy, which is wrong for latitude/longitude where 0 is a valid coordinate.
    // ?? only treats null/undefined as nullish, preserving 0, false, and empty strings.
    const reminder: Reminder = {
      id, userId,
      title: input.title,
      notes: input.notes ?? null,
      type: input.type,
      triggerAt: input.triggerAt ?? null,
      recurrenceRule: input.recurrenceRule ?? null,
      nextTriggerAt: input.triggerAt ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      radius: input.radius ?? 200,
      locationName: input.locationName ?? null,
      triggerOn: input.triggerOn ?? null,
      isRecurringLocation: input.isRecurringLocation ?? false,
      deliveryMethod: input.deliveryMethod ?? 'notification',
      alarmSound: input.alarmSound ?? null,
      shareContactName: input.shareContactName ?? null,
      shareContactPhone: input.shareContactPhone ?? null,
      shareMessageTemplate: input.shareMessageTemplate ?? null,
      categoryId: input.categoryId ?? null,
      priority: input.priority ?? 'medium',
      isCompleted: false, isActive: true, completedAt: null,
      notificationId: null, geofenceId: null,
      syncedAt: null, isDeleted: false,
      createdAt: now, updatedAt: now,
    };

    const dbData = mapReminderToDb(reminder);
    const columns = Object.keys(dbData).join(', ');
    const placeholders = Object.keys(dbData).map(() => '?').join(', ');
    await db.runAsync(
      `INSERT INTO reminders (${columns}) VALUES (${placeholders})`,
      Object.values(dbData) as (string | number | null)[]
    );
    return reminder;
  },

  async update(id: string, input: UpdateReminderInput): Promise<Reminder> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Reminder not found');

    const updates: Partial<Reminder> & { updatedAt: string } = {
      ...input, updatedAt: new Date().toISOString(),
    };
    const dbUpdates = mapReminderToDb(updates);
    const setClause = Object.keys(dbUpdates).map((key) => `${key} = ?`).join(', ');
    await db.runAsync(
      `UPDATE reminders SET ${setClause} WHERE id = ?`,
      [...Object.values(dbUpdates), id] as (string | number | null)[]
    );
    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update reminder');
    return updated;
  },

  async complete(id: string): Promise<Reminder> {
    return this.update(id, {
      isCompleted: true, isActive: false, completedAt: new Date().toISOString(),
    });
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE reminders SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?`, [id]
    );
  },

  async updateNotificationId(id: string, notificationId: string | null): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE reminders SET notification_id = ?, updated_at = datetime('now') WHERE id = ?`,
      [notificationId, id]
    );
  },

  async updateGeofenceId(id: string, geofenceId: string | null): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE reminders SET geofence_id = ?, updated_at = datetime('now') WHERE id = ?`,
      [geofenceId, id]
    );
  },

  async countActive(userId: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM reminders
       WHERE user_id = ? AND is_deleted = 0 AND is_active = 1 AND is_completed = 0`,
      [userId]
    );
    return result?.count || 0;
  },
};
```

---

## 2. React Query Hooks

All UI components use these hooks. Each mutation writes to SQLite, schedules/cancels notifications, and queues cloud sync.

### QueryClient Configuration

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30 seconds staleTime: reminders change frequently (user creates, completes, snoozes)
      // and the local SQLite reads are near-instant, so the cost of re-fetching is negligible.
      // A longer staleTime would cause stale UI after background sync or notification actions.
      staleTime: 1000 * 30, // 30 seconds
      retry: 2,
    },
  },
});
```

### Query and Mutation Hooks

```typescript
// src/hooks/useReminders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reminderRepository } from '@/repositories/reminderRepository';
import { notificationScheduler } from '@/services/notifications/scheduler';
import { useAuthStore } from '@/stores/authStore';
import { CreateReminderInput, UpdateReminderInput, Reminder } from '@/types/database';
import { addToSyncQueue, processSyncQueue, isConnected, isGuestUser } from '@/services/sync/syncService';

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

// --- MUTATION HOOKS (with optimistic updates) ---

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

      // Sync to cloud (all fields)
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
    // Optimistic update: add the new reminder to cached lists immediately
    onMutate: async (input: CreateReminderInput) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      const previousReminders = queryClient.getQueryData<Reminder[]>(['reminders', user?.id]);

      // Create an optimistic reminder object for immediate UI display
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Reminder[]>(['reminders', user?.id], (old) =>
        old ? [optimisticReminder as Reminder, ...old] : [optimisticReminder as Reminder]
      );

      return { previousReminders };
    },
    onError: (_err, _input, context) => {
      // Roll back on error
      if (context?.previousReminders) {
        queryClient.setQueryData(['reminders', user?.id], context.previousReminders);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

// Full example: useCompleteReminder with optimistic update
export function useCompleteReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      // Cancel notification first
      const existing = await reminderRepository.getById(id);
      if (existing?.notificationId) {
        await notificationScheduler.cancelReminder(existing.notificationId);
      }

      // Mark complete in SQLite
      const reminder = await reminderRepository.complete(id);

      // Sync to cloud
      await syncReminderToCloud(user!.id, id, 'update', {
        isCompleted: reminder.isCompleted,
        isActive: reminder.isActive,
        completedAt: reminder.completedAt,
        updatedAt: reminder.updatedAt,
      });

      return reminder;
    },
    // Optimistic update: immediately mark the reminder as completed in the cache
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['reminders'] });

      // Snapshot previous values for rollback
      const previousActive = queryClient.getQueryData<Reminder[]>(['reminders', 'active', user?.id]);
      const previousToday = queryClient.getQueryData<Reminder[]>(['reminders', 'today', user?.id]);
      const previousAll = queryClient.getQueryData<Reminder[]>(['reminders', user?.id]);

      const now = new Date().toISOString();

      // Optimistically update all cached lists
      const markComplete = (reminders: Reminder[] | undefined) =>
        reminders?.map((r) =>
          r.id === id ? { ...r, isCompleted: true, isActive: false, completedAt: now } : r
        );

      queryClient.setQueryData<Reminder[]>(['reminders', 'active', user?.id], (old) =>
        old?.filter((r) => r.id !== id) // Remove from active list
      );
      queryClient.setQueryData<Reminder[]>(['reminders', 'today', user?.id], markComplete);
      queryClient.setQueryData<Reminder[]>(['reminders', user?.id], markComplete);

      // Also update individual reminder cache
      queryClient.setQueryData<Reminder>(['reminder', id], (old) =>
        old ? { ...old, isCompleted: true, isActive: false, completedAt: now } : old
      );

      return { previousActive, previousToday, previousAll };
    },
    onError: (_err, id, context) => {
      // Roll back all caches on error
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

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      // Cancel notification if scheduled
      const existing = await reminderRepository.getById(id);
      if (existing?.notificationId) {
        await notificationScheduler.cancelReminder(existing.notificationId);
      }

      // Soft-delete in SQLite
      await reminderRepository.delete(id);

      // Sync to cloud
      await syncReminderToCloud(user!.id, id, 'delete', { isDeleted: true });
    },
    // Optimistic update: immediately remove from all cached lists
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

// useUpdateReminder follows the same optimistic pattern:
// 1. onMutate: cancel queries, snapshot cache, apply optimistic update
// 2. onError: roll back to snapshot
// 3. onSettled: invalidate to refetch from SQLite
```

---

## 3. Sync Service

Offline-first sync engine. Queues changes locally, processes when online.

**Key concepts:**
- Guest users (`userId.startsWith('guest_')`) never sync
- Sync queue retries up to 5 times with exponential backoff
- `fullSync()` = process queue + push local + pull remote (incremental)
- Conflict resolution: local wins if modified more recently, otherwise server wins

```typescript
// src/services/sync/syncService.ts - Key functions:

// Check if user can sync
export function isGuestUser(userId: string): boolean {
  return userId.startsWith('guest_');
}

// Check connectivity
export async function isConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

// Add to offline queue
export async function addToSyncQueue(
  entityType: 'reminder' | 'category' | 'saved_place',
  entityId: string,
  operation: 'create' | 'update' | 'delete',
  data: Record<string, unknown>,
  userId: string
): Promise<void> { /* inserts into sync_queue table */ }

// Max retry attempts before marking as failed
const MAX_RETRY_ATTEMPTS = 5;

// Process pending queue items with exponential backoff and deduplication
export async function processSyncQueue(userId: string): Promise<{ success: number; failed: number }> {
  const db = await getDatabase();
  const items = await db.getAllAsync<SyncQueueItem>(
    `SELECT * FROM sync_queue WHERE user_id = ? AND status = 'pending' ORDER BY created_at ASC`,
    [userId]
  );

  let success = 0;
  let failed = 0;

  for (const item of items) {
    // Skip items that have exceeded max retries
    if (item.attempts >= MAX_RETRY_ATTEMPTS) {
      await db.runAsync(
        `UPDATE sync_queue SET status = 'failed' WHERE id = ?`,
        [item.id]
      );
      failed++;
      continue;
    }

    // Exponential backoff: delay = min(1000 * 2^attempts, 30000)ms
    if (item.attempts > 0) {
      const delay = Math.min(1000 * Math.pow(2, item.attempts), 30000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Mark as in_progress to prevent duplicate processing
    await db.runAsync(
      `UPDATE sync_queue SET status = 'in_progress' WHERE id = ?`,
      [item.id]
    );

    try {
      // Perform the Supabase upsert/delete operation
      await syncEntityToSupabase(item);

      // On success: remove from queue
      await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [item.id]);
      success++;
    } catch (error) {
      // On failure: set back to pending and increment attempt count
      await db.runAsync(
        `UPDATE sync_queue SET status = 'pending', attempts = attempts + 1 WHERE id = ?`,
        [item.id]
      );
      console.error(`Sync failed for ${item.entity_type}/${item.entity_id} (attempt ${item.attempts + 1}):`, error);
      failed++;
    }
  }

  return { success, failed };
}

// Supabase operations use upsert for create/update, soft-delete for delete
// syncReminder() / syncCategory() / syncSavedPlace()

// Pull remote data into local SQLite (incremental - only fetch rows modified since last pull)
export async function pullFromCloud(
  userId: string,
  lastPulledAt?: string
): Promise<{ reminders: number; categories: number; savedPlaces: number }> {
  const db = await getDatabase();

  // If no lastPulledAt provided, read from settings table
  if (!lastPulledAt) {
    const setting = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'last_pulled_at' AND user_id = ?`,
      [userId]
    );
    lastPulledAt = setting?.value ?? undefined;
  }

  // Build query: if lastPulledAt exists, only fetch rows updated since then
  // Otherwise, fetch all rows for this user (initial sync)
  let remindersQuery = 'SELECT * FROM reminders WHERE user_id = ?';
  const params: (string | undefined)[] = [userId];

  if (lastPulledAt) {
    remindersQuery += ' AND updated_at > ?';
    params.push(lastPulledAt);
  }

  // Fetch from Supabase
  const { data: remoteReminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', lastPulledAt ?? '1970-01-01T00:00:00Z');

  // Same pattern for categories and saved_places...

  let reminderCount = 0;

  for (const remote of remoteReminders ?? []) {
    // Conflict detection: compare timestamps before overwriting local data.
    // Strategy: LOCAL WINS if the local row has been modified more recently than the remote row.
    // This prevents cloud data from overwriting changes the user made while offline.
    const localRow = await db.getFirstAsync<{ updated_at: string }>(
      `SELECT updated_at FROM reminders WHERE id = ?`,
      [remote.id]
    );

    if (localRow && new Date(localRow.updated_at) > new Date(remote.updated_at)) {
      // Local is newer than remote - skip this row (local wins)
      continue;
    }

    // Remote is newer or row doesn't exist locally - upsert
    await db.runAsync(
      `INSERT OR REPLACE INTO reminders (...) VALUES (...)`,
      [/* mapped remote fields */]
    );
    reminderCount++;
  }

  // Store lastPulledAt timestamp for next incremental pull
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value, user_id) VALUES ('last_pulled_at', ?, ?)`,
    [now, userId]
  );

  return { reminders: reminderCount, categories: 0, savedPlaces: 0 };
}

// Push all local data to Supabase
export async function pushToCloud(userId: string): Promise<{ reminders: number; categories: number; savedPlaces: number }> {
  /* SELECT * from SQLite WHERE user_id, upsert to Supabase */
}

// Full bidirectional sync
export async function fullSync(userId: string): Promise<void> {
  await processSyncQueue(userId);  // flush queue
  await pushToCloud(userId);       // local -> cloud
  await pullFromCloud(userId);     // cloud -> local (incremental)
}
```

---

## 4. Auth Store (Zustand)

Manages user state, authentication, guest mode, and premium status.

```typescript
// src/stores/authStore.ts - Key interface:

interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  isPremium: boolean;
  isGuest: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConnected: boolean;

  initialize: () => Promise<void>;          // Check session/local user on app start
  signIn: (email, password) => Promise<void>;  // Supabase auth + local DB
  signUp: (email, password, name) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;     // Creates guest_<uuid> user locally
  linkGuestToAccount: (email, password, name) => Promise<void>;  // Migrate guest data
  syncPremiumWithRevenueCat: () => Promise<void>;
}
```

**Guest user behavior:**
- Guest IDs start with `guest_` prefix
- All data stays local (no sync)
- Can be converted to full account (data migrated by updating user_id on all rows)

**Premium status flow:**

Premium status is **server-write only**. The Supabase `profiles.is_premium` and `profiles.premium_expires_at` fields are updated exclusively by the RevenueCat webhook calling a Supabase Edge Function. The client NEVER writes premium status to Supabase.

```typescript
// syncPremiumWithRevenueCat() does the following:
// 1. Checks RevenueCat SDK for active 'premium' entitlement
// 2. Updates the LOCAL SQLite user record (isPremium, premiumExpiresAt)
// 3. Updates the Zustand store state
//
// It does NOT write to Supabase profiles. The server-side webhook
// (RevenueCat -> Edge Function -> profiles table) is the single source
// of truth for premium status in the cloud. This prevents race conditions
// and ensures the server has authoritative billing state.
//
// On app start, the store also reads profiles.is_premium from Supabase
// to catch any webhook-driven changes that happened while the app was closed.
```

1. On app start: read `profiles.is_premium` from Supabase, update local state
2. On purchase: RevenueCat webhook -> Edge Function -> `profiles.is_premium = true`
3. On restore: same as purchase (server-side)
4. Expiration: RevenueCat webhook -> Edge Function -> `profiles.is_premium = false`
5. Client-side: `syncPremiumWithRevenueCat()` checks RevenueCat SDK, updates LOCAL state only

---

## 5. Notification Service

### Setup (permissions + channels)

```typescript
// src/services/notifications/setup.ts
// - Requests notification permissions
// - Sets notification handler (show alert, play sound for alarms)
// - Android: Creates 'reminders' channel (HIGH importance) for standard reminders
// - Android: Creates 'alarms' channel (MAX importance, bypass DND) for alarm-type reminders
//
// Channel configuration:
//   'reminders': { name: 'Reminders', importance: HIGH, sound: 'default' }
//   'alarms':    { name: 'Alarms', importance: MAX, sound: 'alarm.wav', bypassDnd: true }

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function setupNotifications(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  // Set how notifications appear when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => ({
      shouldShowAlert: true,
      shouldPlaySound: notification.request.content.data?.deliveryMethod === 'alarm',
      shouldSetBadge: false,
    }),
  });

  // Android notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('alarms', {
      name: 'Alarms',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'alarm.wav',
      bypassDnd: true,
      vibrationPattern: [0, 500, 500, 500, 500, 500],
    });
  }

  return true;
}
```

### Scheduler

```typescript
// src/services/notifications/scheduler.ts

// Available snooze durations (in minutes)
const SNOOZE_OPTIONS = [5, 10, 15, 30, 60] as const;
type SnoozeDuration = typeof SNOOZE_OPTIONS[number];

export const notificationScheduler = {
  scheduleReminder(reminder): Promise<string | null>
    // Schedules notification at triggerAt date
    // Returns notification ID (stored on reminder)
    // Location reminders return null (use geofencing instead)
    // Past dates return null

  cancelReminder(notificationId): Promise<void>
  cancelAllForReminder(reminderId): Promise<void>
  rescheduleReminder(reminder): Promise<string | null>

  // Snooze a reminder for a configurable duration.
  // Available durations: 5, 10, 15, 30, 60 minutes.
  // Default is 10 minutes if no duration specified.
  snooze(reminderId: string, minutes: SnoozeDuration = 10): Promise<string>
    // Accepts one of the predefined snooze durations
    // Cancels existing notification, schedules new one at now + minutes
    // Returns new notification ID

  getAllScheduled(): Promise<NotificationRequest[]>
  cancelAll(): Promise<void>
};
```

### Handlers

```typescript
// src/services/notifications/handlers.ts
// - Foreground: logs notification received
// - User tap: navigates to /reminder/{id}
// - "complete" action: marks reminder complete via repository
// - "snooze" action: reschedules +10 minutes via scheduler
```

---

## 6. Location / Geofencing Service

### Permissions

```typescript
// src/services/location/permissions.ts
requestForegroundLocationPermission(): Promise<boolean>
requestBackgroundLocationPermission(): Promise<boolean>  // Shows explanation alert first
requestGeofencingPermissions(): Promise<{ granted, foreground, background }>
getCurrentLocation(): Promise<LocationObject | null>
getLastKnownLocation(): Promise<LocationObject | null>
isLocationServicesEnabled(): Promise<boolean>
```

### Geofencing

```typescript
// src/services/location/geofencing.ts
// IMPORTANT: defineGeofencingTask() must be called at top-level of app (module scope)

const GEOFENCING_TASK = 'REMINDME_GEOFENCING_TASK';

// Android geofence limit management
// Android allows approximately 100 concurrent geofences per app.
// We use a buffer of 5 to avoid hitting the hard limit.
const MAX_GEOFENCES = 95;

defineGeofencingTask()       // Register background task (handles enter/exit events)
startGeofencing(reminderId, lat, lng, radius, triggerOn)  // Register a geofence
stopGeofencing(reminderId)   // Remove a single geofence
stopAllGeofencing()          // Remove all geofences
refreshAllGeofences()        // Re-register all active location reminders

// Get the current number of registered geofences
getGeofenceCount(): Promise<number>
  // Returns count from local tracking (we maintain a geofences table/registry in SQLite)

// When registering a new geofence and approaching the limit:
// 1. Check getGeofenceCount() against MAX_GEOFENCES
// 2. If at limit, prioritize which geofences to keep:
//    (a) Closest to the user's current location
//    (b) Most recently created (newer reminders take priority)
// 3. Remove the lowest-priority geofence to make room
// 4. Register the new geofence

// When geofence triggers:
// 1. Look up reminder in SQLite
// 2. Check if trigger_on matches event type (enter/exit/both)
// 3. Send immediate notification
// 4. Record in reminder_history
// 5. If not recurring: mark complete + stop geofencing
```

---

## 7. RevenueCat (In-App Purchases)

```typescript
// src/services/purchases/revenueCat.ts

const PREMIUM_ENTITLEMENT_ID = 'premium';
const PRODUCT_IDS = {
  MONTHLY: 'remindme_pro_monthly',
  YEARLY: 'remindme_pro_yearly',
  LIFETIME: 'remindme_pro_lifetime',
};

// Android-only configuration
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

initializeRevenueCat()                   // Configure SDK with Android API key
loginRevenueCat(userId)                  // Associate user
logoutRevenueCat()                       // Disassociate user
getOfferings()                           // Get available packages
purchasePackage(package)                 // Purchase (handles cancellation)
restorePurchases()                       // Restore from store
checkPremiumStatus()                     // Check 'premium' entitlement
getActiveSubscription()                  // Get expiration, willRenew, etc.
addCustomerInfoUpdateListener(cb)        // Listen for changes
```

---

## 8. Supabase Auth Service

```typescript
// src/services/supabase/auth.ts
export const authService = {
  signUp(email, password, displayName?)   // supabase.auth.signUp with metadata
  signIn(email, password)                  // supabase.auth.signInWithPassword
  signOut()                                // supabase.auth.signOut
  getSession()                             // Check active session
  getUser()                                // Get current user
  resetPassword(email)                     // Send password reset email
  updatePassword(newPassword)              // Change password
  onAuthStateChange(callback)              // Listen for auth events
};
```

---

## 8.5 Boot Receiver

Ensures all notifications and geofences are restored after app cold start or device reboot.

```typescript
// src/services/notifications/bootReceiver.ts
//
// On app cold start or after device reboot, scheduled notifications and
// registered geofences are lost. This service restores them.

import { getDatabase } from '@/services/database/sqlite';
import { notificationScheduler } from '@/services/notifications/scheduler';
import { startGeofencing, getGeofenceCount } from '@/services/location/geofencing';
import * as Notifications from 'expo-notifications';

export async function restoreNotificationsAndGeofences(userId: string): Promise<{
  notificationsRestored: number;
  geofencesRestored: number;
}> {
  const db = await getDatabase();
  let notificationsRestored = 0;
  let geofencesRestored = 0;

  // --- Restore time-based notifications ---

  // Get all active time-based reminders that should have a scheduled notification
  const timeReminders = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM reminders
     WHERE user_id = ? AND is_deleted = 0 AND is_active = 1 AND is_completed = 0
       AND type = 'time' AND trigger_at > datetime('now')`,
    [userId]
  );

  // Get currently scheduled notifications to avoid duplicates
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIds = new Set(scheduledNotifications.map((n) => n.identifier));

  for (const row of timeReminders) {
    const reminder = mapReminderFromDb(row);

    // Only re-schedule if no notification currently exists for this reminder
    if (reminder.notificationId && scheduledIds.has(reminder.notificationId)) {
      continue; // Already scheduled, skip
    }

    const notificationId = await notificationScheduler.scheduleReminder(reminder);
    if (notificationId) {
      await db.runAsync(
        `UPDATE reminders SET notification_id = ? WHERE id = ?`,
        [notificationId, reminder.id]
      );
      notificationsRestored++;
    }
  }

  // --- Restore location-based geofences ---

  // Get all active location-based reminders
  const locationReminders = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM reminders
     WHERE user_id = ? AND is_deleted = 0 AND is_active = 1 AND is_completed = 0
       AND type = 'location' AND latitude IS NOT NULL AND longitude IS NOT NULL`,
    [userId]
  );

  for (const row of locationReminders) {
    const reminder = mapReminderFromDb(row);

    // Re-register the geofence
    try {
      await startGeofencing(
        reminder.id,
        reminder.latitude!,
        reminder.longitude!,
        reminder.radius ?? 200,
        reminder.triggerOn ?? 'enter'
      );
      geofencesRestored++;
    } catch (error) {
      console.error(`Failed to restore geofence for reminder ${reminder.id}:`, error);
    }
  }

  console.log(`Boot receiver: restored ${notificationsRestored} notifications, ${geofencesRestored} geofences`);
  return { notificationsRestored, geofencesRestored };
}

// Call this from the app's root layout or initialization:
// useEffect(() => {
//   if (user && !user.isGuest) {
//     restoreNotificationsAndGeofences(user.id);
//   }
// }, [user]);
```

---

## 9. Google Places & Geocoding

Location search and reverse geocoding for the reminder creation flow.

```typescript
// src/services/location/placesApi.ts
//
// All functions use the Google Maps API key from environment config.
// This key must have Places API and Geocoding API enabled in the Google Cloud Console.

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';
const GEOCODING_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode';

interface PlacePrediction {
  placeId: string;
  description: string;         // Full formatted address/name
  mainText: string;            // Primary name (e.g., "Starbucks")
  secondaryText: string;       // Secondary info (e.g., "123 Main St, City")
  types: string[];             // Place types (e.g., ['cafe', 'establishment'])
}

interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  types: string[];
}

interface GeocodingResult {
  formattedAddress: string;
  placeId: string;
  addressComponents: {
    longName: string;
    shortName: string;
    types: string[];
  }[];
}

// Search for places using Google Places Autocomplete API.
// Optionally bias results toward a specific location (user's current position).
export async function searchPlaces(
  query: string,
  location?: { lat: number; lng: number }
): Promise<PlacePrediction[]> {
  const params = new URLSearchParams({
    input: query,
    key: API_KEY,
    types: 'establishment|geocode',
  });

  if (location) {
    params.append('location', `${location.lat},${location.lng}`);
    params.append('radius', '50000'); // 50km bias radius
  }

  const response = await fetch(`${PLACES_BASE_URL}/autocomplete/json?${params}`);
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${data.status}`);
  }

  return (data.predictions ?? []).map((p: any) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? '',
    types: p.types ?? [],
  }));
}

// Get full details (including coordinates) for a place by its place ID.
// Use this after the user selects a place from the autocomplete results.
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const params = new URLSearchParams({
    place_id: placeId,
    key: API_KEY,
    fields: 'place_id,name,formatted_address,geometry,types',
  });

  const response = await fetch(`${PLACES_BASE_URL}/details/json?${params}`);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Place Details API error: ${data.status}`);
  }

  const result = data.result;
  return {
    placeId: result.place_id,
    name: result.name,
    formattedAddress: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    types: result.types ?? [],
  };
}

// Reverse geocode coordinates to a human-readable address.
// Used when the user drops a pin on the map or uses current location.
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: API_KEY,
  });

  const response = await fetch(`${GEOCODING_BASE_URL}/json?${params}`);
  const data = await response.json();

  if (data.status !== 'OK' || !data.results?.length) {
    return null;
  }

  const result = data.results[0];
  return {
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
    addressComponents: result.address_components.map((c: any) => ({
      longName: c.long_name,
      shortName: c.short_name,
      types: c.types,
    })),
  };
}
```

---

## Key Data Flow Examples

### Creating a Reminder

```
User fills form -> useCreateReminder().mutate(input)
  -> onMutate: optimistic update                     // Immediately add to query cache
    -> cancelQueries(['reminders'])                   // Prevent stale refetches
    -> snapshot previous cache for rollback
    -> setQueryData(['reminders', userId], add optimistic reminder)
  -> mutationFn (async):
    -> reminderRepository.create(userId, input)       // Write to SQLite
    -> notificationScheduler.scheduleReminder()       // Schedule push notification
    -> reminderRepository.updateNotificationId()      // Store notification ID
    -> syncReminderToCloud()                          // Queue for Supabase sync
      -> addToSyncQueue()                             // Insert into sync_queue
      -> processSyncQueue()                           // Try immediate upsert
  -> onSettled: invalidateQueries(['reminders'])      // Refetch from SQLite (replaces optimistic data)
  -> onError: roll back cache to snapshot
```

### Completing a Reminder

```
User taps checkbox -> useCompleteReminder().mutate(id)
  -> onMutate: optimistic update                      // Immediately mark complete in cache
    -> cancelQueries(['reminders'])                    // Prevent stale refetches
    -> snapshot active, today, all caches
    -> remove from active list cache
    -> mark as completed in today + all caches
  -> mutationFn (async):
    -> notificationScheduler.cancelReminder()         // Cancel scheduled notification
    -> reminderRepository.complete(id)                // Set is_completed=1, is_active=0
    -> syncReminderToCloud('update', allFields)       // Sync to Supabase
  -> onSettled: invalidateQueries(['reminders'])      // Refetch from SQLite
  -> onError: roll back all caches to snapshots
```

### App Start Sync

```
App launches -> initialize() (auth store)
  -> Check Supabase session
  -> If session exists: read profiles.is_premium from Supabase
  -> syncPremiumWithRevenueCat() -> update LOCAL state only
  -> restoreNotificationsAndGeofences(userId)  // Boot receiver
  -> (User can manually trigger fullSync from Settings)
    -> processSyncQueue()                      // Flush queue (with exponential backoff)
    -> pushToCloud()                           // Local -> cloud
    -> pullFromCloud(lastPulledAt)             // Cloud -> local (incremental, conflict-aware)
```
