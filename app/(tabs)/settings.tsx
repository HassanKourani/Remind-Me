import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User, LogOut, Crown, Bell, MapPin, Cloud, Download, Trash2,
  ChevronRight, Shield, FileText, Wifi, WifiOff, RefreshCw
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/authStore';
import { usePendingSyncCount, useLastSyncTime, useSyncNow } from '@/hooks/useSync';
import { getLocationPermissionStatus, requestForegroundLocationPermission, requestBackgroundLocationPermission } from '@/services/location/permissions';
import { getGeofenceCount } from '@/services/location/geofencing';
import { getDatabase } from '@/services/database/sqlite';
import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-slate-100 px-4 py-3.5 dark:border-slate-800"
    >
      <View className="mr-3">{icon}</View>
      <Text
        className={`flex-1 text-base ${
          danger ? 'text-red-500' : 'text-slate-800 dark:text-slate-100'
        }`}
      >
        {label}
      </Text>
      {value && (
        <Text className="mr-2 text-sm text-slate-500 dark:text-slate-400">{value}</Text>
      )}
      {onPress && <ChevronRight size={20} color="#94a3b8" />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isConnected, signOut } = useAuthStore();

  const { data: locationPermissions, refetch: refetchPermissions } = useQuery({
    queryKey: ['locationPermissions'],
    queryFn: getLocationPermissionStatus,
  });
  const { data: geofenceCount } = useQuery({
    queryKey: ['geofenceCount'],
    queryFn: getGeofenceCount,
  });

  const { data: pendingCount } = usePendingSyncCount();
  const { data: lastSyncTime } = useLastSyncTime();
  const { syncNow, isSyncing } = useSyncNow();

  const formatLastSync = (time: string | null | undefined) => {
    if (!time) return 'Never';
    const date = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const handleExportData = async () => {
    try {
      const db = await getDatabase();
      const reminders = await db.getAllAsync('SELECT * FROM reminders WHERE user_id = ?', [user!.id]);
      const categories = await db.getAllAsync('SELECT * FROM categories WHERE user_id = ?', [user!.id]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        userId: user!.id,
        reminders,
        categories,
      };

      const filePath = FileSystem.documentDirectory + 'remindme-export.json';
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(exportData, null, 2));
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Export RemindMe Pro Data',
      });
    } catch (error: any) {
      Alert.alert('Export Failed', error.message ?? 'Failed to export data');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call edge function to delete from cloud
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                const { error } = await supabase.functions.invoke('delete-user', {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (error) throw error;
              }

              // Clear local data
              const db = await getDatabase();
              await db.execAsync(
                `DELETE FROM reminders WHERE user_id = '${user!.id}';
                 DELETE FROM categories WHERE user_id = '${user!.id}';
                 DELETE FROM sync_queue WHERE user_id = '${user!.id}';
                 DELETE FROM users WHERE id = '${user!.id}';`
              );

              await supabase.auth.signOut();
              await signOut();
              router.replace('/(auth)/welcome');
            } catch (error: any) {
              Alert.alert('Delete Failed', error.message ?? 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      Alert.alert('Notifications', 'Notification permissions are already granted.');
    } else {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus === 'granted') {
        Alert.alert('Notifications', 'Notification permissions granted.');
      } else {
        Alert.alert('Notifications', 'Please enable notifications in your device settings.');
      }
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView>
        {/* Profile header */}
        <LinearGradient colors={['#0ea5e9', '#0369a1']} className="items-center px-6 pb-6 pt-8">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <User size={32} color="#ffffff" />
          </View>
          <Text className="mt-3 text-xl font-bold text-white">
            {user?.displayName ?? 'Guest User'}
          </Text>
          <Text className="mt-1 text-sm text-sky-100">
            {user?.email ?? 'No account'}
          </Text>
          {user?.isPremium && (
            <View className="mt-2 flex-row items-center rounded-full bg-amber-400/20 px-3 py-1">
              <Crown size={14} color="#fbbf24" />
              <Text className="ml-1 text-xs font-semibold text-amber-200">Premium</Text>
            </View>
          )}
        </LinearGradient>

        {/* Connection status */}
        <View className="flex-row items-center justify-center gap-2 bg-slate-50 py-2 dark:bg-slate-800/50">
          {isConnected ? (
            <>
              <Wifi size={14} color="#22c55e" />
              <Text className="text-xs text-green-600">Connected</Text>
            </>
          ) : (
            <>
              <WifiOff size={14} color="#ef4444" />
              <Text className="text-xs text-red-500">Offline</Text>
            </>
          )}
        </View>

        {/* Account */}
        <Text className="px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Account
        </Text>
        {user?.isGuest ? (
          <SettingsRow
            icon={<User size={20} color="#0ea5e9" />}
            label="Create Account"
            onPress={() => router.push('/(auth)/register')}
          />
        ) : (
          <SettingsRow
            icon={<User size={20} color="#0ea5e9" />}
            label="Edit Profile"
            onPress={() => {}}
          />
        )}

        {/* Premium */}
        <Text className="px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Premium
        </Text>
        <SettingsRow
          icon={<Crown size={20} color="#f59e0b" />}
          label={user?.isPremium ? 'Manage Subscription' : 'Upgrade to Premium'}
          value={user?.isPremium ? 'Active' : 'Free'}
          onPress={() => router.push('/premium/')}
        />

        {/* Notifications */}
        <Text className="px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Notifications
        </Text>
        <SettingsRow
          icon={<Bell size={20} color="#8b5cf6" />}
          label="Notification Permissions"
          onPress={handleNotificationPermissions}
        />

        {/* Location */}
        <Text className="px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Location
        </Text>
        <SettingsRow
          icon={<MapPin size={20} color="#ef4444" />}
          label="Foreground Location"
          value={locationPermissions?.foreground ? 'Granted' : 'Not Granted'}
          onPress={async () => {
            await requestForegroundLocationPermission();
            refetchPermissions();
          }}
        />
        <SettingsRow
          icon={<MapPin size={20} color="#ef4444" />}
          label="Background Location"
          value={locationPermissions?.background ? 'Granted' : 'Not Granted'}
          onPress={async () => {
            await requestBackgroundLocationPermission();
            refetchPermissions();
          }}
        />
        {(geofenceCount ?? 0) > 0 && (
          <SettingsRow
            icon={<MapPin size={20} color="#0ea5e9" />}
            label="Active Geofences"
            value={`${geofenceCount}`}
          />
        )}

        {/* Cloud & Sync */}
        <Text className="px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Cloud & Sync
        </Text>
        <SettingsRow
          icon={isSyncing ? <ActivityIndicator size="small" color="#0ea5e9" /> : <RefreshCw size={20} color="#0ea5e9" />}
          label="Sync Now"
          value={isSyncing ? 'Syncing...' : formatLastSync(lastSyncTime)}
          onPress={user?.isGuest ? undefined : syncNow}
        />
        {!user?.isGuest && (pendingCount ?? 0) > 0 && (
          <SettingsRow
            icon={<Cloud size={20} color="#f59e0b" />}
            label="Pending Changes"
            value={`${pendingCount}`}
          />
        )}

        {/* Privacy & Data */}
        <Text className="px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Privacy & Data
        </Text>
        <SettingsRow
          icon={<Download size={20} color="#22c55e" />}
          label="Export Data"
          onPress={handleExportData}
        />
        {!user?.isGuest && (
          <SettingsRow
            icon={<Trash2 size={20} color="#ef4444" />}
            label="Delete Account"
            onPress={handleDeleteAccount}
            danger
          />
        )}

        {/* About */}
        <Text className="px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          About
        </Text>
        <SettingsRow
          icon={<FileText size={20} color="#64748b" />}
          label="Terms of Service"
          onPress={() => router.push('/legal/terms')}
        />
        <SettingsRow
          icon={<Shield size={20} color="#64748b" />}
          label="Privacy Policy"
          onPress={() => router.push('/legal/privacy')}
        />

        {/* Sign out */}
        <View className="px-4 py-6">
          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center justify-center rounded-xl border border-red-200 py-3 dark:border-red-900"
          >
            <LogOut size={20} color="#ef4444" />
            <Text className="ml-2 text-base font-semibold text-red-500">
              Sign Out
            </Text>
          </Pressable>
        </View>

        <Text className="pb-8 text-center text-xs text-slate-400 dark:text-slate-500">
          RemindMe Pro v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
