import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

export async function requestForegroundLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  // Check foreground first
  const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    const granted = await requestForegroundLocationPermission();
    if (!granted) return false;
  }

  // Show explanation before requesting background
  return new Promise((resolve) => {
    Alert.alert(
      'Background Location',
      'RemindMe Pro needs background location access to trigger location-based reminders when you arrive at or leave a place. This is required for geofencing to work even when the app is closed.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Allow',
          onPress: async () => {
            const { status } = await Location.requestBackgroundPermissionsAsync();
            if (status === 'granted') {
              resolve(true);
            } else {
              Alert.alert(
                'Permission Required',
                'Please enable "Allow all the time" in your device settings for location reminders to work.',
                [
                  { text: 'Cancel', onPress: () => resolve(false) },
                  { text: 'Open Settings', onPress: () => { Linking.openSettings(); resolve(false); } },
                ]
              );
            }
          },
        },
      ]
    );
  });
}

export async function requestGeofencingPermissions(): Promise<{
  granted: boolean;
  foreground: boolean;
  background: boolean;
}> {
  const foreground = await requestForegroundLocationPermission();
  if (!foreground) return { granted: false, foreground: false, background: false };

  const background = await requestBackgroundLocationPermission();
  return { granted: background, foreground, background };
}

export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const granted = await requestForegroundLocationPermission();
      if (!granted) return null;
    }

    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch (error) {
    console.error('[Location] Failed to get current location:', error);
    return null;
  }
}

export async function getLastKnownLocation(): Promise<Location.LocationObject | null> {
  try {
    return await Location.getLastKnownPositionAsync();
  } catch {
    return null;
  }
}

export async function isLocationServicesEnabled(): Promise<boolean> {
  return await Location.hasServicesEnabledAsync();
}

export async function getLocationPermissionStatus(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const fg = await Location.getForegroundPermissionsAsync();
  const bg = await Location.getBackgroundPermissionsAsync();
  return {
    foreground: fg.status === 'granted',
    background: bg.status === 'granted',
  };
}
