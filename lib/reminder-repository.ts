import * as Crypto from 'expo-crypto';

import { getDatabase } from './database';
import type { Reminder, ReminderInsert, SyncStatus } from '@/types/reminder';

function rowToReminder(row: Record<string, unknown>): Reminder {
  return {
    ...row,
    is_completed: Boolean(row.is_completed),
    repeat_days: row.repeat_days ? JSON.parse(row.repeat_days as string) : null,
  } as Reminder;
}

export async function getAllReminders(ownerId: string): Promise<Reminder[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM reminders WHERE owner_id = ? AND sync_status != 'pending_delete' ORDER BY created_at DESC`,
    [ownerId],
  );
  return rows.map(rowToReminder);
}

export async function getReminderById(id: string): Promise<Reminder | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM reminders WHERE id = ?`,
    [id],
  );
  return row ? rowToReminder(row) : null;
}

export async function getTodayReminders(ownerId: string): Promise<Reminder[]> {
  const db = getDatabase();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM reminders
     WHERE owner_id = ? AND sync_status != 'pending_delete'
       AND ((type = 'time' AND date_time >= ? AND date_time < ?) OR type = 'location')
     ORDER BY date_time ASC`,
    [ownerId, startOfDay, endOfDay],
  );
  return rows.map(rowToReminder);
}

export async function getUpcomingReminders(ownerId: string): Promise<Reminder[]> {
  const db = getDatabase();
  const now = new Date().toISOString();

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM reminders
     WHERE owner_id = ? AND sync_status != 'pending_delete'
       AND is_completed = 0 AND type = 'time' AND date_time > ?
     ORDER BY date_time ASC`,
    [ownerId, now],
  );
  return rows.map(rowToReminder);
}

export async function createReminder(
  data: ReminderInsert,
  syncStatus: SyncStatus = 'synced',
): Promise<Reminder> {
  const db = getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO reminders (
      id, owner_id, type, title, notes, priority, category, is_completed, completed_at,
      date_time, repeat_type, repeat_interval, repeat_unit, repeat_days,
      location_lat, location_lng, location_address, location_radius, location_trigger, location_notify,
      created_at, updated_at, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.owner_id,
      data.type,
      data.title,
      data.notes ?? null,
      data.priority,
      data.category,
      data.date_time ?? null,
      data.repeat_type,
      data.repeat_interval ?? null,
      data.repeat_unit ?? null,
      data.repeat_days ? JSON.stringify(data.repeat_days) : null,
      data.location_lat ?? null,
      data.location_lng ?? null,
      data.location_address ?? null,
      data.location_radius ?? null,
      data.location_trigger ?? null,
      data.location_notify ?? null,
      now,
      now,
      syncStatus,
    ],
  );

  return (await getReminderById(id))!;
}

export async function updateReminder(
  id: string,
  updates: Partial<Omit<Reminder, 'id' | 'created_at'>>,
  syncStatus?: SyncStatus,
): Promise<Reminder | null> {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];

  if (syncStatus) {
    fields.push('sync_status = ?');
    values.push(syncStatus);
  }

  const fieldMap: Record<string, string | number | boolean | null | number[]> = { ...updates } as Record<string, string | number | boolean | null | number[]>;
  delete fieldMap.updated_at;
  delete fieldMap.sync_status;

  if ('repeat_days' in fieldMap) {
    fieldMap.repeat_days = fieldMap.repeat_days ? JSON.stringify(fieldMap.repeat_days) : null;
  }
  if ('is_completed' in fieldMap) {
    fieldMap.is_completed = fieldMap.is_completed ? 1 : 0;
  }

  for (const [key, value] of Object.entries(fieldMap)) {
    fields.push(`${key} = ?`);
    if (typeof value === 'boolean') {
      values.push(value ? 1 : 0);
    } else if (Array.isArray(value)) {
      values.push(JSON.stringify(value));
    } else {
      values.push((value as string | number | null) ?? null);
    }
  }

  values.push(id);

  await db.runAsync(`UPDATE reminders SET ${fields.join(', ')} WHERE id = ?`, values);
  return getReminderById(id);
}

export async function deleteReminder(id: string, soft = false): Promise<void> {
  const db = getDatabase();
  if (soft) {
    await db.runAsync(
      `UPDATE reminders SET sync_status = 'pending_delete', updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id],
    );
  } else {
    await db.runAsync(`DELETE FROM reminders WHERE id = ?`, [id]);
  }
}

export async function toggleComplete(id: string, syncStatus?: SyncStatus): Promise<Reminder | null> {
  const db = getDatabase();
  const reminder = await getReminderById(id);
  if (!reminder) return null;

  const isCompleted = !reminder.is_completed;
  const completedAt = isCompleted ? new Date().toISOString() : null;

  return updateReminder(id, { is_completed: isCompleted, completed_at: completedAt }, syncStatus);
}

// Sync helpers

export async function getPendingChanges(ownerId: string): Promise<Reminder[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM reminders WHERE owner_id = ? AND sync_status != 'synced'`,
    [ownerId],
  );
  return rows.map(rowToReminder);
}

export async function markSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE reminders SET sync_status = 'synced' WHERE id IN (${placeholders})`,
    ids,
  );
}

export async function bulkUpsert(reminders: Reminder[]): Promise<void> {
  if (reminders.length === 0) return;
  const db = getDatabase();

  for (const r of reminders) {
    await db.runAsync(
      `INSERT OR REPLACE INTO reminders (
        id, owner_id, type, title, notes, priority, category, is_completed, completed_at,
        date_time, repeat_type, repeat_interval, repeat_unit, repeat_days,
        location_lat, location_lng, location_address, location_radius, location_trigger, location_notify,
        created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
      [
        r.id,
        r.owner_id,
        r.type,
        r.title,
        r.notes ?? null,
        r.priority,
        r.category,
        r.is_completed ? 1 : 0,
        r.completed_at ?? null,
        r.date_time ?? null,
        r.repeat_type,
        r.repeat_interval ?? null,
        r.repeat_unit ?? null,
        r.repeat_days ? JSON.stringify(r.repeat_days) : null,
        r.location_lat ?? null,
        r.location_lng ?? null,
        r.location_address ?? null,
        r.location_radius ?? null,
        r.location_trigger ?? null,
        r.location_notify ?? null,
        r.created_at,
        r.updated_at,
      ],
    );
  }
}

export async function clearOwnerData(ownerId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM reminders WHERE owner_id = ?`, [ownerId]);
}

export async function reassignOwner(fromOwnerId: string, toOwnerId: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE reminders SET owner_id = ?, sync_status = 'pending_create', updated_at = ? WHERE owner_id = ?`,
    [toOwnerId, now, fromOwnerId],
  );
}

export async function getCompletedCount(ownerId: string): Promise<number> {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM reminders WHERE owner_id = ? AND is_completed = 1 AND sync_status != 'pending_delete'`,
    [ownerId],
  );
  return result?.count ?? 0;
}

export async function getTodayCount(ownerId: string): Promise<number> {
  const db = getDatabase();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM reminders
     WHERE owner_id = ? AND sync_status != 'pending_delete' AND is_completed = 0
       AND type = 'time' AND date_time >= ? AND date_time < ?`,
    [ownerId, startOfDay, endOfDay],
  );
  return result?.count ?? 0;
}

export async function getUpcomingCount(ownerId: string): Promise<number> {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM reminders
     WHERE owner_id = ? AND sync_status != 'pending_delete' AND is_completed = 0
       AND type = 'time' AND date_time > ?`,
    [ownerId, now],
  );
  return result?.count ?? 0;
}
