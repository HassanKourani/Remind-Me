import { getDatabase } from '@/services/database/sqlite';
import { notificationScheduler } from '@/services/notifications/scheduler';
import { mapReminderFromDb } from '@/lib/mappers';
import { startGeofencing } from '@/services/location/geofencing';
import * as Notifications from 'expo-notifications';

export async function restoreNotificationsAndGeofences(userId: string): Promise<{
  notificationsRestored: number;
  geofencesRestored: number;
}> {
  const db = await getDatabase();
  let notificationsRestored = 0;
  let geofencesRestored = 0;

  // Restore time-based notifications
  const timeReminders = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM reminders
     WHERE user_id = ? AND is_deleted = 0 AND is_active = 1 AND is_completed = 0
       AND type = 'time' AND trigger_at > datetime('now')`,
    [userId]
  );

  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIds = new Set(scheduledNotifications.map((n) => n.identifier));

  for (const row of timeReminders) {
    const reminder = mapReminderFromDb(row);

    if (reminder.notificationId && scheduledIds.has(reminder.notificationId)) {
      continue;
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

  // Restore location-based geofences
  const locationReminders = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM reminders
     WHERE user_id = ? AND is_deleted = 0 AND is_active = 1 AND is_completed = 0
       AND type = 'location' AND latitude IS NOT NULL AND longitude IS NOT NULL`,
    [userId]
  );

  for (const row of locationReminders) {
    const reminder = mapReminderFromDb(row);
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
      console.error(`[Boot] Failed to restore geofence for ${reminder.id}:`, error);
    }
  }

  console.log(`[Boot] Restored ${notificationsRestored} notifications, ${geofencesRestored} geofences`);
  return { notificationsRestored, geofencesRestored };
}
