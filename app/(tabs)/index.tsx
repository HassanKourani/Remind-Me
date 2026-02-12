import { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTodayReminders, useReminderCount, useCompletedTodayCount, useCompleteReminder, useUncompleteReminder } from '@/hooks/useReminders';
import { useSyncOnRefresh } from '@/hooks/useSync';
import { useAuthStore } from '@/stores/authStore';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { Card } from '@/components/ui/Card';
import { Snackbar } from '@/components/ui/Snackbar';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { getBannerAdUnitId } from '@/services/ads/adService';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: reminders, isLoading, refetch } = useTodayReminders();
  const { data: activeCount } = useReminderCount();
  const { data: completedToday } = useCompletedTodayCount();
  const completeMutation = useCompleteReminder();
  const uncompleteMutation = useUncompleteReminder();
  const syncOnRefresh = useSyncOnRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; undoId: string } | null>(null);
  const lastCompletedId = useRef<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await syncOnRefresh();
    await refetch();
    setIsRefreshing(false);
  }, [syncOnRefresh, refetch]);

  const handleComplete = useCallback((id: string) => {
    lastCompletedId.current = id;
    const reminder = reminders?.find((r) => r.id === id);
    completeMutation.mutate(id);
    setSnackbar({
      message: `"${reminder?.title ?? 'Reminder'}" completed`,
      undoId: id,
    });
  }, [reminders, completeMutation]);

  const handleUndo = useCallback(() => {
    if (snackbar?.undoId) {
      uncompleteMutation.mutate(snackbar.undoId);
    }
    setSnackbar(null);
  }, [snackbar, uncompleteMutation]);

  const todayTotal = reminders?.length ?? 0;
  const todayCompleted = reminders?.filter((r) => r.isCompleted).length ?? 0;
  const progress = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View className="mb-4 mt-4">
            <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {getGreeting()}
            </Text>
            <Text className="mt-1 text-base text-slate-500 dark:text-slate-400">
              {user?.displayName ?? 'there'}
            </Text>

            {user?.isGuest && (
              <Pressable
                onPress={() => router.push('/(auth)/register')}
                className="mt-3 rounded-lg bg-sky-50 p-3 dark:bg-sky-900/30"
              >
                <Text className="text-sm font-medium text-sky-600 dark:text-sky-400">
                  Sign up to enable cloud sync →
                </Text>
              </Pressable>
            )}

            {/* Stats cards */}
            <View className="mt-4 flex-row gap-3">
              <Card className="flex-1">
                <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {activeCount ?? 0}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">Active</Text>
              </Card>
              <Card className="flex-1">
                <Text className="text-2xl font-bold text-green-600">
                  {completedToday ?? 0}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">Completed</Text>
              </Card>
              <Card className="flex-1">
                <Text className="text-2xl font-bold text-amber-600">
                  {todayTotal - todayCompleted}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">Pending</Text>
              </Card>
            </View>

            {/* Progress bar */}
            {todayTotal > 0 && (
              <View className="mt-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Today's progress
                  </Text>
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {Math.round(progress)}%
                  </Text>
                </View>
                <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <View
                    style={{ width: `${progress}%` }}
                    className="h-full rounded-full bg-sky-500"
                  />
                </View>
              </View>
            )}

            <Text className="mb-2 mt-6 text-lg font-semibold text-slate-800 dark:text-slate-100">
              Today's Reminders
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ReminderCard
            reminder={item}
            onComplete={handleComplete}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
          ) : (
            <View className="items-center py-12">
              <Text className="text-base text-slate-400 dark:text-slate-500">
                No reminders for today
              </Text>
              <Text className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                Tap + to create one
              </Text>
            </View>
          )
        }
      />

      {/* Banner ad for free users */}
      {!user?.isPremium && (
        <View className="items-center border-t border-slate-200 bg-white py-1 dark:border-slate-700 dark:bg-slate-900">
          <BannerAd unitId={getBannerAdUnitId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
      )}

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/reminder/create')}
        className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full bg-sky-500 shadow-lg"
      >
        <Plus size={28} color="#ffffff" />
      </Pressable>

      <Snackbar
        visible={!!snackbar}
        message={snackbar?.message ?? ''}
        actionLabel="Undo"
        onAction={handleUndo}
        onDismiss={() => setSnackbar(null)}
      />
    </SafeAreaView>
  );
}
