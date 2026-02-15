import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Reminder } from '@/types/reminder';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('high-priority', {
      name: 'High Priority Reminders',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 250, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export async function scheduleTimeReminder(reminder: Reminder): Promise<string | null> {
  if (!reminder.date_time || reminder.is_completed) return null;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const triggerDate = new Date(reminder.date_time);
  if (triggerDate <= new Date()) return null;

  const channelId = reminder.priority === 'high' ? 'high-priority' : 'default';

  const id = await Notifications.scheduleNotificationAsync({
    identifier: reminder.id,
    content: {
      title: reminder.title,
      body: reminder.notes ?? 'Time for your reminder!',
      data: { reminderId: reminder.id },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

export async function cancelNotification(reminderId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(reminderId);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function reregisterAllNotifications(reminders: Reminder[]): Promise<void> {
  await cancelAllNotifications();

  for (const reminder of reminders) {
    if (reminder.type === 'time' && !reminder.is_completed && reminder.date_time) {
      await scheduleTimeReminder(reminder);
    }
  }
}
