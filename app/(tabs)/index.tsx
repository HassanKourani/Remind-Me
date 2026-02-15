import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

import { PageHeader } from '@/components/ui/page-header';
import { NetworkIndicator } from '@/components/ui/network-indicator';
import { ReminderCard } from '@/components/reminders/reminder-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/stores/auth-store';
import { useReminderStore } from '@/stores/reminder-store';
import { fullSync } from '@/lib/sync-service';

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: string;
  onPress?: () => void;
}) {
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: color + '18',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <Animated.Text style={{ color: text, fontSize: 13, fontWeight: '600' }}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

function EmptyStateCard() {
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');

  return (
    <View
      style={{
        backgroundColor: surface,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialIcons name="notifications-none" size={32} color={primary} />
      </View>
      <Animated.Text style={{ color: text, fontSize: 17, fontWeight: '700' }}>
        No reminders yet
      </Animated.Text>
      <Animated.Text
        style={{ color: textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}
      >
        Tap the + button to create your first reminder and stay on top of what matters.
      </Animated.Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const primary = useThemeColor({}, 'primary');
  const success = useThemeColor({}, 'success');
  const warning = useThemeColor({}, 'warning');

  const isGuest = useAuthStore((s) => s.isGuest);
  const user = useAuthStore((s) => s.user);

  const reminders = useReminderStore((s) => s.reminders);
  const isLoading = useReminderStore((s) => s.isLoading);
  const todayCount = useReminderStore((s) => s.todayCount);
  const upcomingCount = useReminderStore((s) => s.upcomingCount);
  const completedCount = useReminderStore((s) => s.completedCount);
  const loadReminders = useReminderStore((s) => s.loadReminders);
  const toggleComplete = useReminderStore((s) => s.toggleComplete);

  const ownerId = isGuest ? 'guest' : user?.id ?? '';
  const name = isGuest ? 'Guest' : user?.email ? user.email.split('@')[0] : '';

  useEffect(() => {
    if (ownerId) {
      loadReminders(ownerId);
    }
  }, [ownerId]);

  const todayReminders = useMemo(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return reminders.filter((r) => {
      if (r.type === 'location') return true;
      if (!r.date_time) return false;
      const dt = new Date(r.date_time);
      return dt >= startOfDay && dt < endOfDay;
    });
  }, [reminders]);

  const handleRefresh = useCallback(async () => {
    if (!isGuest && user?.id) {
      await fullSync(user.id);
    }
    await loadReminders(ownerId);
  }, [isGuest, user?.id, ownerId]);

  const handleToggleComplete = useCallback(
    (id: string) => {
      toggleComplete(id, isGuest);
    },
    [isGuest],
  );

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <PageHeader>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4, flex: 1 }}>
            <Animated.Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
              {isGuest ? 'Guest Mode' : 'Welcome back'}
            </Animated.Text>
            <Animated.Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>
              Hello, {name}
            </Animated.Text>
          </View>
          <NetworkIndicator />
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          {[
            { count: String(todayCount), label: 'Today' },
            { count: String(upcomingCount), label: 'Upcoming' },
            { count: String(completedCount), label: 'Completed' },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Animated.Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>
                {stat.count}
              </Animated.Text>
              <Animated.Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                {stat.label}
              </Animated.Text>
            </View>
          ))}
        </View>

        {/* Guest warning inside header */}
        {isGuest && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginTop: 4,
            }}
          >
            <MaterialIcons name="cloud-off" size={16} color="rgba(255,255,255,0.7)" />
            <Animated.Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, flex: 1 }}>
              Data stored locally only. Sign up to sync across devices.
            </Animated.Text>
          </View>
        )}
      </PageHeader>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 100,
          gap: 24,
        }}
      >
        {/* Quick Actions */}
        <View style={{ gap: 12 }}>
          <Animated.Text style={{ color: text, fontSize: 16, fontWeight: '600' }}>
            Quick Actions
          </Animated.Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <QuickAction
              icon="add-circle-outline"
              label="New Reminder"
              color={primary}
              onPress={() => router.push('/reminder/create')}
            />
            <QuickAction icon="today" label="Today" color={success} />
            <QuickAction icon="schedule" label="Upcoming" color={warning} />
          </View>
        </View>

        {/* Today's Reminders */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Animated.Text style={{ color: text, fontSize: 16, fontWeight: '600' }}>
              Today's Reminders
            </Animated.Text>
            <Pressable onPress={() => router.push('/(tabs)/reminders')}>
              <Animated.Text style={{ color: primary, fontSize: 13, fontWeight: '500' }}>
                See all
              </Animated.Text>
            </Pressable>
          </View>
          {todayReminders.length === 0 ? (
            <EmptyStateCard />
          ) : (
            <View style={{ gap: 10 }}>
              {todayReminders.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
