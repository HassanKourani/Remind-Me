import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { processSyncQueue, pullFromCloud, getPendingSyncCount, getLastSyncTime, isConnected, isGuestUser } from '@/services/sync/syncService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useSyncOnRefresh() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const syncAndRefresh = useCallback(async () => {
    if (!user || isGuestUser(user.id)) return;

    try {
      const connected = await isConnected();
      if (connected) {
        await processSyncQueue(user.id);
        await pullFromCloud(user.id);
      }
    } catch (error) {
      console.error('[Sync] Refresh sync failed:', error);
    }

    // Invalidate all reminder queries to pick up pulled data
    await queryClient.invalidateQueries({ queryKey: ['reminders'] });
  }, [user, queryClient]);

  return syncAndRefresh;
}

export function usePendingSyncCount() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['sync', 'pendingCount', user?.id],
    queryFn: () => getPendingSyncCount(user!.id),
    enabled: !!user && !isGuestUser(user.id),
    refetchInterval: 30000,
  });
}

export function useLastSyncTime() {
  return useQuery({
    queryKey: ['sync', 'lastSyncTime'],
    queryFn: () => getLastSyncTime(),
  });
}

export function useSyncNow() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncNow = useCallback(async () => {
    if (!user || isGuestUser(user.id) || isSyncing) return;

    setIsSyncing(true);
    try {
      const connected = await isConnected();
      if (!connected) {
        setIsSyncing(false);
        return;
      }

      await processSyncQueue(user.id);
      await pullFromCloud(user.id);
      await queryClient.invalidateQueries({ queryKey: ['reminders'] });
      await queryClient.invalidateQueries({ queryKey: ['sync'] });
    } catch (error) {
      console.error('[Sync] Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [user, isSyncing, queryClient]);

  return { syncNow, isSyncing };
}
