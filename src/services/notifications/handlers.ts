import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { reminderRepository } from '@/repositories/reminderRepository';
import { notificationScheduler } from './scheduler';

let foregroundSubscription: Notifications.Subscription | null = null;
let responseSubscription: Notifications.Subscription | null = null;

export function setupNotificationHandlers() {
  // Handle notification received while app is in foreground
  foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Notification] Received:', notification.request.content.title);
  });

  // Handle user tapping on notification
  responseSubscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
    const data = response.notification.request.content.data;
    const actionId = response.actionIdentifier;

    if (!data?.reminderId) return;

    const reminderId = data.reminderId as string;

    if (actionId === 'complete') {
      await reminderRepository.complete(reminderId);
    } else if (actionId === 'snooze') {
      const notificationId = await notificationScheduler.snooze(reminderId, 10);
      await reminderRepository.updateNotificationId(reminderId, notificationId);
    } else {
      // Default: navigate to detail
      router.push(`/reminder/${reminderId}`);
    }
  });

  // Register notification action categories
  Notifications.setNotificationCategoryAsync('reminder_actions', [
    {
      identifier: 'complete',
      buttonTitle: 'Complete',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'snooze',
      buttonTitle: 'Snooze (10 min)',
      options: { opensAppToForeground: false },
    },
  ]);
}

export function cleanupNotificationHandlers() {
  foregroundSubscription?.remove();
  responseSubscription?.remove();
}
