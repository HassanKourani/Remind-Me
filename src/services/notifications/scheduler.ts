import * as Notifications from 'expo-notifications';
import { Reminder } from '@/types/database';

const SNOOZE_OPTIONS = [5, 10, 15, 30, 60] as const;
export type SnoozeDuration = (typeof SNOOZE_OPTIONS)[number];

export const notificationScheduler = {
  async scheduleReminder(reminder: Reminder): Promise<string | null> {
    if (reminder.type !== 'time' || !reminder.triggerAt) return null;

    const triggerDate = new Date(reminder.triggerAt);
    if (triggerDate <= new Date()) return null;

    const channelId = reminder.deliveryMethod === 'alarm' ? 'alarms' : 'reminders';

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.notes ?? 'Time for your reminder!',
        data: {
          reminderId: reminder.id,
          deliveryMethod: reminder.deliveryMethod,
          type: 'reminder',
        },
        categoryIdentifier: 'reminder_actions',
        ...(channelId && { channelId }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return notificationId;
  },

  async cancelReminder(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  async cancelAllForReminder(reminderId: string): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.reminderId === reminderId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  },

  async rescheduleReminder(reminder: Reminder): Promise<string | null> {
    if (reminder.notificationId) {
      await this.cancelReminder(reminder.notificationId);
    }
    return this.scheduleReminder(reminder);
  },

  async snooze(reminderId: string, minutes: SnoozeDuration = 10): Promise<string> {
    const snoozeDate = new Date(Date.now() + minutes * 60 * 1000);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Snoozed Reminder',
        body: `Reminder snoozed for ${minutes} minutes`,
        data: {
          reminderId,
          type: 'snooze',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeDate,
      },
    });

    return notificationId;
  },

  async getAllScheduled(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  },

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
