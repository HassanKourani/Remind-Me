import { supabase } from './supabase';
import * as repo from './reminder-repository';
import type { Reminder } from '@/types/reminder';

interface SupabaseReminder {
  id: string;
  owner_id: string;
  type: string;
  title: string;
  notes: string | null;
  priority: string;
  category: string;
  is_completed: boolean;
  completed_at: string | null;
  date_time: string | null;
  repeat_type: string;
  repeat_interval: number | null;
  repeat_unit: string | null;
  repeat_days: number[] | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  location_radius: number | null;
  location_trigger: string | null;
  location_notify: string | null;
  created_at: string;
  updated_at: string;
}

function toSupabaseRow(r: Reminder): Omit<SupabaseReminder, 'created_at' | 'updated_at'> {
  return {
    id: r.id,
    owner_id: r.owner_id,
    type: r.type,
    title: r.title,
    notes: r.notes,
    priority: r.priority,
    category: r.category,
    is_completed: r.is_completed,
    completed_at: r.completed_at,
    date_time: r.date_time,
    repeat_type: r.repeat_type,
    repeat_interval: r.repeat_interval,
    repeat_unit: r.repeat_unit,
    repeat_days: r.repeat_days,
    location_lat: r.location_lat,
    location_lng: r.location_lng,
    location_address: r.location_address,
    location_radius: r.location_radius,
    location_trigger: r.location_trigger,
    location_notify: r.location_notify,
  };
}

function fromSupabaseRow(row: SupabaseReminder): Reminder {
  return {
    ...row,
    sync_status: 'synced',
  } as Reminder;
}

export async function pushToCloud(userId: string): Promise<void> {
  const pending = await repo.getPendingChanges(userId);
  if (pending.length === 0) return;

  const creates = pending.filter((r) => r.sync_status === 'pending_create');
  const updates = pending.filter((r) => r.sync_status === 'pending_update');
  const deletes = pending.filter((r) => r.sync_status === 'pending_delete');

  // Batch insert
  if (creates.length > 0) {
    const { error } = await supabase
      .from('reminders')
      .upsert(creates.map(toSupabaseRow), { onConflict: 'id' });
    if (!error) {
      await repo.markSynced(creates.map((r) => r.id));
    }
  }

  // Batch update
  for (const r of updates) {
    const { error } = await supabase
      .from('reminders')
      .update(toSupabaseRow(r))
      .eq('id', r.id);
    if (!error) {
      await repo.markSynced([r.id]);
    }
  }

  // Batch delete
  if (deletes.length > 0) {
    const ids = deletes.map((r) => r.id);
    const { error } = await supabase
      .from('reminders')
      .delete()
      .in('id', ids);
    if (!error) {
      // Hard delete locally after cloud delete
      for (const id of ids) {
        await repo.deleteReminder(id, false);
      }
    }
  }
}

export async function pullFromCloud(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('owner_id', userId);

  if (error || !data) return;

  const cloudReminders = (data as SupabaseReminder[]).map(fromSupabaseRow);

  // Get local reminders that are already synced (not pending changes)
  const localReminders = await repo.getAllReminders(userId);
  const localMap = new Map(localReminders.map((r) => [r.id, r]));

  const toUpsert: Reminder[] = [];

  for (const cloud of cloudReminders) {
    const local = localMap.get(cloud.id);
    if (!local) {
      // New from cloud
      toUpsert.push(cloud);
    } else if (local.sync_status === 'synced') {
      // Last-write-wins: compare updated_at
      if (new Date(cloud.updated_at) > new Date(local.updated_at)) {
        toUpsert.push(cloud);
      }
    }
    // If local has pending changes, skip — push will handle it
  }

  // Delete local synced reminders that no longer exist in cloud
  const cloudIds = new Set(cloudReminders.map((r) => r.id));
  for (const local of localReminders) {
    if (local.sync_status === 'synced' && !cloudIds.has(local.id)) {
      await repo.deleteReminder(local.id, false);
    }
  }

  await repo.bulkUpsert(toUpsert);
}

export async function fullSync(userId: string): Promise<void> {
  await pushToCloud(userId);
  await pullFromCloud(userId);
}

export async function mergeGuestData(userId: string): Promise<void> {
  await repo.reassignOwner('guest', userId);
  await pushToCloud(userId);
}
