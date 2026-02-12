import '../global.css';

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';

import { queryClient } from '@/lib/queryClient';
import { initializeDatabase } from '@/services/database/sqlite';
import { useAuthStore } from '@/stores/authStore';
import { setupNotifications } from '@/services/notifications/setup';
import { setupNotificationHandlers, cleanupNotificationHandlers } from '@/services/notifications/handlers';
import { restoreNotificationsAndGeofences } from '@/services/notifications/bootReceiver';
import { initializeRevenueCat, loginRevenueCat } from '@/services/purchases/revenueCat';
import { initializeAds } from '@/services/ads/adService';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
        console.log('[Init] Database initialized');
        await initialize();
        console.log('[Init] Auth initialized');
        await setupNotifications();
        setupNotificationHandlers();
        console.log('[Init] Notifications initialized');

        // Initialize RevenueCat
        await initializeRevenueCat();
        console.log('[Init] RevenueCat initialized');

        // Restore notifications after boot and sync premium (if user exists)
        const currentUser = useAuthStore.getState().user;
        if (currentUser && !currentUser.isGuest) {
          await loginRevenueCat(currentUser.id);
          await useAuthStore.getState().syncPremiumWithRevenueCat();
          restoreNotificationsAndGeofences(currentUser.id);
        }

        // Initialize ads (for non-premium users)
        if (!currentUser?.isPremium) {
          await initializeAds();
          console.log('[Init] Ads initialized');
        }
      } catch (error) {
        console.error('[Init] Failed to initialize:', error);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    init();
  }, []);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthGuard>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen
                name="reminder/create"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="reminder/[id]"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="premium/index"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="legal/terms"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="legal/privacy"
                options={{ headerShown: false }}
              />
            </Stack>
          </AuthGuard>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
