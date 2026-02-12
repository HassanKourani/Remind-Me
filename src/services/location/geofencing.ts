import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { getDatabase } from '@/services/database/sqlite';
import { mapReminderFromDb } from '@/lib/mappers';

const GEOFENCING_TASK = 'REMINDME_GEOFENCING_TASK';
const MAX_GEOFENCES = 95;

// Define the geofencing task at module scope (required by expo-task-manager)
TaskManager.defineTask(GEOFENCING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[Geofencing] Task error:', error);
    return;
  }

  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };

  const reminderId = region.identifier;
  if (!reminderId) return;

  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM reminders WHERE id = ? AND is_deleted = 0 AND is_active = 1 AND is_completed = 0`,
      [reminderId]
    );

    if (!row) return;

    const reminder = mapReminderFromDb(row);
    const triggerOn = reminder.triggerOn ?? 'enter';

    // Check if the event type matches the trigger condition
    const isEnter = eventType === Location.GeofencingEventType.Enter;
    const isExit = eventType === Location.GeofencingEventType.Exit;

    if (
      (triggerOn === 'enter' && !isEnter) ||
      (triggerOn === 'exit' && !isExit)
    ) {
      return; // Event doesn't match trigger
    }

    // Send notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.notes ?? (isEnter ? `You've arrived at ${reminder.locationName ?? 'this location'}` : `You've left ${reminder.locationName ?? 'this location'}`),
        data: { reminderId: reminder.id, deliveryMethod: reminder.deliveryMethod },
        categoryIdentifier: 'reminder_actions',
        ...(reminder.deliveryMethod === 'alarm'
          ? { sound: 'alarm.wav', priority: 'max' }
          : { sound: 'default' }),
      },
      trigger: null, // Immediate
    });

    // If not recurring, mark complete and stop geofencing
    if (!reminder.isRecurringLocation) {
      await db.runAsync(
        `UPDATE reminders SET is_completed = 1, is_active = 0, completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
        [reminderId]
      );
      await stopGeofencing(reminderId);
    }
  } catch (error) {
    console.error(`[Geofencing] Error handling event for ${reminderId}:`, error);
  }
});

export async function startGeofencing(
  reminderId: string,
  latitude: number,
  longitude: number,
  radius: number = 200,
  triggerOn: 'enter' | 'exit' | 'both' = 'enter'
): Promise<void> {
  const regions: Location.LocationRegion[] = [{
    identifier: reminderId,
    latitude,
    longitude,
    radius,
    notifyOnEnter: triggerOn === 'enter' || triggerOn === 'both',
    notifyOnExit: triggerOn === 'exit' || triggerOn === 'both',
  }];

  // Get existing geofences and add this one
  const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCING_TASK);
  if (isTaskRegistered) {
    // Get existing regions to merge
    const existingRegions = await getRegisteredRegions();
    const filteredRegions = existingRegions.filter(r => r.identifier !== reminderId);

    // Check limit
    if (filteredRegions.length >= MAX_GEOFENCES) {
      // Remove the oldest one (last in list)
      filteredRegions.pop();
    }

    await Location.startGeofencingAsync(GEOFENCING_TASK, [...filteredRegions, ...regions]);
  } else {
    await Location.startGeofencingAsync(GEOFENCING_TASK, regions);
  }

  // Update reminder with geofence ID
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE reminders SET geofence_id = ? WHERE id = ?`,
    [reminderId, reminderId]
  );
}

export async function stopGeofencing(reminderId: string): Promise<void> {
  try {
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCING_TASK);
    if (!isTaskRegistered) return;

    const existingRegions = await getRegisteredRegions();
    const filteredRegions = existingRegions.filter(r => r.identifier !== reminderId);

    if (filteredRegions.length === 0) {
      await Location.stopGeofencingAsync(GEOFENCING_TASK);
    } else {
      await Location.startGeofencingAsync(GEOFENCING_TASK, filteredRegions);
    }

    // Clear geofence ID from reminder
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE reminders SET geofence_id = NULL WHERE id = ?`,
      [reminderId]
    );
  } catch (error) {
    console.error(`[Geofencing] Failed to stop for ${reminderId}:`, error);
  }
}

export async function stopAllGeofencing(): Promise<void> {
  try {
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCING_TASK);
    if (isTaskRegistered) {
      await Location.stopGeofencingAsync(GEOFENCING_TASK);
    }
  } catch (error) {
    console.error('[Geofencing] Failed to stop all:', error);
  }
}

export async function refreshAllGeofences(userId: string): Promise<number> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM reminders
     WHERE user_id = ? AND is_deleted = 0 AND is_active = 1 AND is_completed = 0
       AND type = 'location' AND latitude IS NOT NULL AND longitude IS NOT NULL
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, MAX_GEOFENCES]
  );

  if (rows.length === 0) {
    await stopAllGeofencing();
    return 0;
  }

  const regions: Location.LocationRegion[] = rows.map(row => {
    const reminder = mapReminderFromDb(row);
    const triggerOn = reminder.triggerOn ?? 'enter';
    return {
      identifier: reminder.id,
      latitude: reminder.latitude!,
      longitude: reminder.longitude!,
      radius: reminder.radius ?? 200,
      notifyOnEnter: triggerOn === 'enter' || triggerOn === 'both',
      notifyOnExit: triggerOn === 'exit' || triggerOn === 'both',
    };
  });

  await Location.startGeofencingAsync(GEOFENCING_TASK, regions);
  return regions.length;
}

export async function getGeofenceCount(): Promise<number> {
  try {
    const regions = await getRegisteredRegions();
    return regions.length;
  } catch {
    return 0;
  }
}

async function getRegisteredRegions(): Promise<Location.LocationRegion[]> {
  try {
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCING_TASK);
    if (!isTaskRegistered) return [];

    const tasks = await TaskManager.getRegisteredTasksAsync();
    const geofencingTask = tasks.find(t => t.taskName === GEOFENCING_TASK);
    // expo-location doesn't expose registered regions directly,
    // so we track via SQLite
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders
       WHERE is_deleted = 0 AND is_active = 1 AND is_completed = 0
         AND type = 'location' AND latitude IS NOT NULL AND longitude IS NOT NULL
         AND geofence_id IS NOT NULL`
    );

    return rows.map(row => {
      const reminder = mapReminderFromDb(row);
      const triggerOn = reminder.triggerOn ?? 'enter';
      return {
        identifier: reminder.id,
        latitude: reminder.latitude!,
        longitude: reminder.longitude!,
        radius: reminder.radius ?? 200,
        notifyOnEnter: triggerOn === 'enter' || triggerOn === 'both',
        notifyOnExit: triggerOn === 'exit' || triggerOn === 'both',
      };
    });
  } catch {
    return [];
  }
}
