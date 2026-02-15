import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Reminder } from '@/types/reminder';

const GEOFENCE_TASK = 'GEOFENCE_TASK';

// Register background task for geofence events
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;

  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };

  const reminderId = region.identifier;

  // Determine if we should notify based on trigger type
  // The region identifier stores the reminder id
  // We send a notification for enter/leave events
  const isEnter = eventType === Location.GeofencingEventType.Enter;
  const isExit = eventType === Location.GeofencingEventType.Exit;

  if (!isEnter && !isExit) return;

  const eventLabel = isEnter ? 'Arrived at' : 'Left';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Location Reminder',
      body: `${eventLabel} your reminder location`,
      data: { reminderId },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
    },
    trigger: null, // Immediate
  });
});

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') return false;

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  return background === 'granted';
}

export async function startGeofencing(reminder: Reminder): Promise<void> {
  if (
    !reminder.location_lat ||
    !reminder.location_lng ||
    !reminder.location_radius ||
    reminder.is_completed
  ) {
    return;
  }

  const hasPermission = await requestLocationPermissions();
  if (!hasPermission) return;

  const regions: Location.LocationRegion[] = [
    {
      identifier: reminder.id,
      latitude: reminder.location_lat,
      longitude: reminder.location_lng,
      radius: reminder.location_radius,
      notifyOnEnter:
        reminder.location_trigger === 'enter' || reminder.location_trigger === 'both',
      notifyOnExit:
        reminder.location_trigger === 'leave' || reminder.location_trigger === 'both',
    },
  ];

  // Get existing geofences and add the new one
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
  if (isRegistered) {
    // We need to stop and re-register with all regions
    const existing = await getActiveGeofenceRegions();
    const filtered = existing.filter((r) => r.identifier !== reminder.id);
    const all = [...filtered, ...regions];
    await Location.startGeofencingAsync(GEOFENCE_TASK, all);
  } else {
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  }
}

export async function stopGeofencing(reminderId: string): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
  if (!isRegistered) return;

  const existing = await getActiveGeofenceRegions();
  const remaining = existing.filter((r) => r.identifier !== reminderId);

  if (remaining.length === 0) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  } else {
    await Location.startGeofencingAsync(GEOFENCE_TASK, remaining);
  }
}

async function getActiveGeofenceRegions(): Promise<Location.LocationRegion[]> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (!isRegistered) return [];
    // There's no direct API to get regions, so we track via re-registration
    return [];
  } catch {
    return [];
  }
}

export async function reregisterAllGeofences(reminders: Reminder[]): Promise<void> {
  const locationReminders = reminders.filter(
    (r) =>
      r.type === 'location' &&
      !r.is_completed &&
      r.location_lat != null &&
      r.location_lng != null,
  );

  if (locationReminders.length === 0) {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
    return;
  }

  const hasPermission = await requestLocationPermissions();
  if (!hasPermission) return;

  const regions: Location.LocationRegion[] = locationReminders.map((r) => ({
    identifier: r.id,
    latitude: r.location_lat!,
    longitude: r.location_lng!,
    radius: r.location_radius ?? 200,
    notifyOnEnter: r.location_trigger === 'enter' || r.location_trigger === 'both',
    notifyOnExit: r.location_trigger === 'leave' || r.location_trigger === 'both',
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
}
