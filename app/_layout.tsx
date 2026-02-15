import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ToastProvider } from '@/components/providers/toast-provider';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { getBiometricPreference } from '@/lib/biometrics';
import { initDatabase } from '@/lib/database';
import { startNetworkMonitor, stopNetworkMonitor } from '@/lib/network-monitor';
import { fullSync, mergeGuestData } from '@/lib/sync-service';
import { useReminderStore } from '@/stores/reminder-store';
import { setupNotificationChannels, reregisterAllNotifications } from '@/lib/notifications';
import { reregisterAllGeofences } from '@/lib/geofencing';
import * as repo from '@/lib/reminder-repository';

SplashScreen.preventAutoHideAsync();

const LightNavTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.primary,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: Colors.light.accent,
  },
};

const DarkNavTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.accent,
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

function useProtectedRoute() {
  const router = useRouter();
  const segments = useSegments();
  const session = useAuthStore((s) => s.session);
  const isGuest = useAuthStore((s) => s.isGuest);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isAuthenticated = !!session || isGuest;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isGuest, isInitialized, segments]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const setSession = useAuthStore((s) => s.setSession);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const mergeHandledRef = useRef(false);

  useProtectedRoute();

  useEffect(() => {
    (async () => {
      // Initialize database
      await initDatabase();

      // Setup notification channels
      await setupNotificationChannels();

      // Check biometric preference
      const bioPref = await getBiometricPreference();
      setBiometricEnabled(bioPref);

      // Get initial session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);

      // Load reminders and re-register notifications/geofences
      if (session?.user) {
        await fullSync(session.user.id);
        await useReminderStore.getState().loadReminders(session.user.id);
        const reminders = useReminderStore.getState().reminders;
        await reregisterAllNotifications(reminders);
        await reregisterAllGeofences(reminders);
      }

      setInitialized(true);
      await SplashScreen.hideAsync();
    })();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      // Handle guest-to-signed-in merge
      if (event === 'SIGNED_IN' && session?.user && !mergeHandledRef.current) {
        mergeHandledRef.current = true;

        // Check for guest data
        const guestReminders = await repo.getAllReminders('guest');
        if (guestReminders.length > 0) {
          Alert.alert(
            'Merge Guest Data?',
            `You have ${guestReminders.length} reminder${guestReminders.length > 1 ? 's' : ''} saved locally. Would you like to merge them with your account?`,
            [
              {
                text: 'Discard',
                style: 'destructive',
                onPress: async () => {
                  await repo.clearOwnerData('guest');
                  useReminderStore.getState().clearAll();
                  await fullSync(session.user.id);
                  await useReminderStore.getState().loadReminders(session.user.id);
                },
              },
              {
                text: 'Merge',
                onPress: async () => {
                  await mergeGuestData(session.user.id);
                  await fullSync(session.user.id);
                  await useReminderStore.getState().loadReminders(session.user.id);
                },
              },
            ],
          );
        } else {
          await fullSync(session.user.id);
          await useReminderStore.getState().loadReminders(session.user.id);
        }
      }

      if (event === 'SIGNED_OUT') {
        mergeHandledRef.current = false;
      }
    });

    // Start network monitor with reconnect handler
    startNetworkMonitor(async () => {
      const authState = useAuthStore.getState();
      if (!authState.isGuest && authState.user?.id) {
        await fullSync(authState.user.id);
        await useReminderStore.getState().refreshFromDb(authState.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      stopNetworkMonitor();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkNavTheme : LightNavTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="(auth)"
            options={{ headerShown: false, animation: 'fade' }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen
            name="reminder/create"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="reminder/[id]"
            options={{ headerShown: false }}
          />
        </Stack>
        <ToastProvider />
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
