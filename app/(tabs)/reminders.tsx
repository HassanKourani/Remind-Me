import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Search, X, CheckCheck, Trash2 } from 'lucide-react-native';
import { useReminders, useActiveReminders, useCompleteReminder, useDeleteReminder, useUncompleteReminder, useRestoreReminder } from '@/hooks/useReminders';
import { useSyncOnRefresh } from '@/hooks/useSync';
import { useAuthStore } from '@/stores/authStore';
import { useSearch } from '@/hooks/useSearch';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { Snackbar } from '@/components/ui/Snackbar';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { getBannerAdUnitId } from '@/services/ads/adService';

type FilterTab = 'all' | 'active' | 'completed';

export default function RemindersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<FilterTab>('all');
  const { data: allReminders, isLoading, refetch } = useReminders();
  const { data: activeReminders } = useActiveReminders();
  const completeMutation = useCompleteReminder();
  const deleteMutation = useDeleteReminder();
  const uncompleteMutation = useUncompleteReminder();
  const restoreMutation = useRestoreReminder();
  const syncOnRefresh = useSyncOnRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<{
    message: string;
    action?: 'uncomplete' | 'restore';
    ids: string[];
  } | null>(null);

  const selectionMode = selectedIds.size > 0;

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleComplete = useCallback((id: string) => {
    const reminder = allReminders?.find((r) => r.id === id);
    completeMutation.mutate(id);
    setSnackbar({
      message: `"${reminder?.title ?? 'Reminder'}" completed`,
      action: 'uncomplete',
      ids: [id],
    });
  }, [allReminders, completeMutation]);

  const handleBatchComplete = useCallback(() => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => completeMutation.mutate(id));
    setSnackbar({
      message: `${ids.length} reminder${ids.length > 1 ? 's' : ''} completed`,
      action: 'uncomplete',
      ids,
    });
    clearSelection();
  }, [selectedIds, completeMutation, clearSelection]);

  const handleBatchDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => deleteMutation.mutate(id));
    setSnackbar({
      message: `${ids.length} reminder${ids.length > 1 ? 's' : ''} deleted`,
      action: 'restore',
      ids,
    });
    clearSelection();
  }, [selectedIds, deleteMutation, clearSelection]);

  const handleUndo = useCallback(() => {
    if (!snackbar) return;
    if (snackbar.action === 'uncomplete') {
      snackbar.ids.forEach((id) => uncompleteMutation.mutate(id));
    } else if (snackbar.action === 'restore') {
      snackbar.ids.forEach((id) => restoreMutation.mutate(id));
    }
    setSnackbar(null);
  }, [snackbar, uncompleteMutation, restoreMutation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await syncOnRefresh();
    await refetch();
    setIsRefreshing(false);
  }, [syncOnRefresh, refetch]);

  const baseList = filter === 'active'
    ? activeReminders
    : filter === 'completed'
    ? allReminders?.filter((r) => r.isCompleted)
    : allReminders;

  const { query, setQuery, filteredResults } = useSearch(baseList);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <View className="px-4 pt-4">
        {selectionMode ? (
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Pressable onPress={clearSelection} hitSlop={8}>
                <X size={24} color="#64748b" />
              </Pressable>
              <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {selectedIds.size} selected
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleBatchComplete}
                className="flex-row items-center gap-1 rounded-lg bg-green-500 px-3 py-2"
              >
                <CheckCheck size={16} color="#ffffff" />
                <Text className="text-sm font-medium text-white">Complete</Text>
              </Pressable>
              <Pressable
                onPress={handleBatchDelete}
                className="flex-row items-center gap-1 rounded-lg bg-red-500 px-3 py-2"
              >
                <Trash2 size={16} color="#ffffff" />
                <Text className="text-sm font-medium text-white">Delete</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text className="mb-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
            Reminders
          </Text>
        )}

        {/* Search bar */}
        <View className="mb-4 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
          <Search size={20} color="#94a3b8" />
          <TextInput
            className="ml-2 flex-1 py-3 text-base text-slate-800 dark:text-slate-100"
            placeholder="Search reminders..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Filter tabs */}
        <View className="mb-4 flex-row gap-2">
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              className={`rounded-full px-4 py-2 ${
                filter === tab.key
                  ? 'bg-sky-500'
                  : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  filter === tab.key
                    ? 'text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredResults}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item }) => (
          <ReminderCard
            reminder={item}
            onComplete={handleComplete}
            onLongPress={toggleSelection}
            selected={selectedIds.has(item.id)}
            selectionMode={selectionMode}
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
                {query ? 'No reminders match your search' : 'No reminders yet'}
              </Text>
              {!query && (
                <Text className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                  Tap + to create your first reminder
                </Text>
              )}
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
      {!selectionMode && (
        <Pressable
          onPress={() => router.push('/reminder/create')}
          className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full bg-sky-500 shadow-lg"
        >
          <Plus size={28} color="#ffffff" />
        </Pressable>
      )}

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
