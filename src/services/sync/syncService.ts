import NetInfo from '@react-native-community/netinfo';
import { getDatabase } from '@/services/database/sqlite';
import { supabase } from '@/services/supabase/client';
import { generateId } from '@/lib/utils';
import { mapReminderFromDb, mapReminderToDb } from '@/lib/mappers';
import { SyncQueueItem } from '@/types/database';

const MAX_RETRY_ATTEMPTS = 5;

export function isGuestUser(userId: string): boolean {
  return userId.startsWith('guest_');
}

export async function isConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

export async function addToSyncQueue(
  entityType: 'reminder' | 'category' | 'saved_place',
  entityId: string,
  operation: 'create' | 'update' | 'delete',
  data: Record<string, unknown>,
  userId: string
): Promise<void> {
  if (isGuestUser(userId)) return;

  const db = await getDatabase();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, entityType, entityId, operation, JSON.stringify(data), userId]
  );
}

async function syncEntityToSupabase(item: SyncQueueItem): Promise<void> {
  const payload = JSON.parse(item.payload);

  if (item.entity_type === 'reminder') {
    if (item.operation === 'delete') {
      await supabase
        .from('reminders')
        .update({ is_deleted: true })
        .eq('id', item.entity_id);
    } else {
      // Map camelCase to snake_case for Supabase
      const supabaseData: Record<string, unknown> = {
        id: item.entity_id,
        user_id: item.user_id,
        title: payload.title,
        notes: payload.notes,
        type: payload.type,
        trigger_at: payload.triggerAt,
        recurrence_rule: payload.recurrenceRule,
        latitude: payload.latitude,
        longitude: payload.longitude,
        radius: payload.radius ?? 200,
        location_name: payload.locationName,
        trigger_on: payload.triggerOn,
        is_recurring_location: payload.isRecurringLocation ?? false,
        delivery_method: payload.deliveryMethod ?? 'notification',
        alarm_sound: payload.alarmSound,
        share_contact_name: payload.shareContactName,
        share_contact_phone: payload.shareContactPhone,
        share_message_template: payload.shareMessageTemplate,
        category_id: payload.categoryId,
        priority: payload.priority ?? 'medium',
        is_completed: payload.isCompleted ?? false,
        is_active: payload.isActive ?? true,
        completed_at: payload.completedAt,
        is_deleted: payload.isDeleted ?? false,
      };

      await supabase.from('reminders').upsert(supabaseData);
    }
  } else if (item.entity_type === 'category') {
    if (item.operation === 'delete') {
      await supabase.from('categories').delete().eq('id', item.entity_id);
    } else {
      await supabase.from('categories').upsert({
        id: item.entity_id,
        user_id: item.user_id,
        ...payload,
      });
    }
  } else if (item.entity_type === 'saved_place') {
    if (item.operation === 'delete') {
      await supabase.from('saved_places').delete().eq('id', item.entity_id);
    } else {
      await supabase.from('saved_places').upsert({
        id: item.entity_id,
        user_id: item.user_id,
        ...payload,
      });
    }
  }
}

export async function processSyncQueue(userId: string): Promise<{ success: number; failed: number }> {
  if (isGuestUser(userId)) return { success: 0, failed: 0 };

  const db = await getDatabase();
  const items = await db.getAllAsync<SyncQueueItem>(
    `SELECT * FROM sync_queue WHERE user_id = ? AND status = 'pending' ORDER BY created_at ASC`,
    [userId]
  );

  let success = 0;
  let failed = 0;

  for (const item of items) {
    if (item.attempts >= MAX_RETRY_ATTEMPTS) {
      await db.runAsync(
        `UPDATE sync_queue SET status = 'failed' WHERE id = ?`,
        [item.id]
      );
      failed++;
      continue;
    }

    if (item.attempts > 0) {
      const delay = Math.min(1000 * Math.pow(2, item.attempts), 30000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    await db.runAsync(
      `UPDATE sync_queue SET status = 'in_progress' WHERE id = ?`,
      [item.id]
    );

    try {
      await syncEntityToSupabase(item);
      await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [item.id]);
      success++;
    } catch (error) {
      await db.runAsync(
        `UPDATE sync_queue SET status = 'pending', attempts = attempts + 1, last_attempt_at = datetime('now') WHERE id = ?`,
        [item.id]
      );
      console.error(`[Sync] Failed for ${item.entity_type}/${item.entity_id} (attempt ${item.attempts + 1}):`, error);
      failed++;
    }
  }

  return { success, failed };
}

export async function pullFromCloud(userId: string): Promise<{ reminders: number; categories: number; savedPlaces: number }> {
  if (isGuestUser(userId)) return { reminders: 0, categories: 0, savedPlaces: 0 };

  const db = await getDatabase();

  // Get last pull timestamp
  const setting = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'last_pulled_at'`
  );
  const lastPulledAt = setting?.value ?? '1970-01-01T00:00:00Z';

  // Fetch remote reminders updated since last pull
  const { data: remoteReminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', lastPulledAt);

  if (error) {
    console.error('[Sync] Pull failed:', error);
    return { reminders: 0, categories: 0, savedPlaces: 0 };
  }

  let reminderCount = 0;

  for (const remote of remoteReminders ?? []) {
    // Conflict resolution: local wins if newer
    const localRow = await db.getFirstAsync<{ updated_at: string }>(
      `SELECT updated_at FROM reminders WHERE id = ?`,
      [remote.id]
    );

    if (localRow && new Date(localRow.updated_at) > new Date(remote.updated_at)) {
      continue; // Local is newer, skip
    }

    // Upsert remote data into local SQLite
    await db.runAsync(
      `INSERT OR REPLACE INTO reminders (
        id, user_id, title, notes, type,
        trigger_at, recurrence_rule,
        latitude, longitude, radius, location_name, trigger_on, is_recurring_location,
        delivery_method, alarm_sound, share_contact_name, share_contact_phone, share_message_template,
        category_id, priority,
        is_completed, is_active, completed_at,
        is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        remote.id, remote.user_id, remote.title, remote.notes, remote.type,
        remote.trigger_at, remote.recurrence_rule,
        remote.latitude, remote.longitude, remote.radius, remote.location_name, remote.trigger_on, remote.is_recurring_location ? 1 : 0,
        remote.delivery_method, remote.alarm_sound, remote.share_contact_name, remote.share_contact_phone, remote.share_message_template,
        remote.category_id, remote.priority,
        remote.is_completed ? 1 : 0, remote.is_active ? 1 : 0, remote.completed_at,
        remote.is_deleted ? 1 : 0, remote.created_at, remote.updated_at,
      ]
    );
    reminderCount++;
  }

  // Update last_pulled_at
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('last_pulled_at', ?)`,
    [now]
  );

  return { reminders: reminderCount, categories: 0, savedPlaces: 0 };
}

export async function pushToCloud(userId: string): Promise<{ reminders: number; categories: number; savedPlaces: number }> {
  if (isGuestUser(userId)) return { reminders: 0, categories: 0, savedPlaces: 0 };

  const db = await getDatabase();

  // Push all local reminders
  const localReminders = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM reminders WHERE user_id = ?`,
    [userId]
  );

  let reminderCount = 0;
  for (const row of localReminders) {
    const reminder = mapReminderFromDb(row);
    try {
      await supabase.from('reminders').upsert({
        id: reminder.id,
        user_id: reminder.userId,
        title: reminder.title,
        notes: reminder.notes,
        type: reminder.type,
        trigger_at: reminder.triggerAt,
        recurrence_rule: reminder.recurrenceRule,
        latitude: reminder.latitude,
        longitude: reminder.longitude,
        radius: reminder.radius,
        location_name: reminder.locationName,
        trigger_on: reminder.triggerOn,
        is_recurring_location: reminder.isRecurringLocation,
        delivery_method: reminder.deliveryMethod,
        alarm_sound: reminder.alarmSound,
        share_contact_name: reminder.shareContactName,
        share_contact_phone: reminder.shareContactPhone,
        share_message_template: reminder.shareMessageTemplate,
        category_id: reminder.categoryId,
        priority: reminder.priority,
        is_completed: reminder.isCompleted,
        is_active: reminder.isActive,
        completed_at: reminder.completedAt,
        is_deleted: reminder.isDeleted,
      });
      reminderCount++;
    } catch (error) {
      console.error(`[Sync] Push failed for reminder ${reminder.id}:`, error);
    }
  }

  return { reminders: reminderCount, categories: 0, savedPlaces: 0 };
}

export async function fullSync(userId: string): Promise<void> {
  await processSyncQueue(userId);
  await pushToCloud(userId);
  await pullFromCloud(userId);
}

export async function getPendingSyncCount(userId: string): Promise<number> {
  if (isGuestUser(userId)) return 0;
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE user_id = ? AND status = 'pending'`,
    [userId]
  );
  return result?.count ?? 0;
}

export async function getLastSyncTime(): Promise<string | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'last_pulled_at'`
  );
  return result?.value ?? null;
}
