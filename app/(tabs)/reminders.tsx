import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
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
import { CATEGORIES } from '@/types/reminder';
import type { Category, ReminderType } from '@/types/reminder';

type FilterStatus = 'all' | 'active' | 'completed';

function FilterChip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: isActive ? primary + '15' : surface,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: isActive ? primary : border,
      }}
    >
      <Animated.Text
        style={{
          color: isActive ? primary : text,
          fontSize: 13,
          fontWeight: isActive ? '600' : '500',
        }}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

function EmptyState() {
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
        padding: 40,
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
        <MaterialIcons name="list-alt" size={32} color={primary} />
      </View>
      <Animated.Text style={{ color: text, fontSize: 17, fontWeight: '700' }}>
        No reminders found
      </Animated.Text>
      <Animated.Text
        style={{ color: textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}
      >
        Try adjusting your filters or create a new reminder to get started!
      </Animated.Text>
    </View>
  );
}

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const border = useThemeColor({}, 'border');

  const isGuest = useAuthStore((s) => s.isGuest);
  const user = useAuthStore((s) => s.user);

  const reminders = useReminderStore((s) => s.reminders);
  const isLoading = useReminderStore((s) => s.isLoading);
  const loadReminders = useReminderStore((s) => s.loadReminders);
  const toggleComplete = useReminderStore((s) => s.toggleComplete);

  const ownerId = isGuest ? 'guest' : user?.id ?? '';

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedType, setSelectedType] = useState<ReminderType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (ownerId) {
      loadReminders(ownerId);
    }
  }, [ownerId]);

  const filteredReminders = useMemo(() => {
    let result = reminders;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q)),
      );
    }

    if (filterStatus === 'active') {
      result = result.filter((r) => !r.is_completed);
    } else if (filterStatus === 'completed') {
      result = result.filter((r) => r.is_completed);
    }

    if (selectedType) {
      result = result.filter((r) => r.type === selectedType);
    }

    if (selectedCategory) {
      result = result.filter((r) => r.category === selectedCategory);
    }

    return result;
  }, [reminders, search, filterStatus, selectedType, selectedCategory]);

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
            <Animated.Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>
              All Reminders
            </Animated.Text>
            <Animated.Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
              {reminders.length} reminder{reminders.length !== 1 ? 's' : ''}
            </Animated.Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <NetworkIndicator />
            <Pressable onPress={() => router.push('/reminder/create')}>
              <MaterialIcons name="add-circle" size={28} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </PageHeader>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
          gap: 16,
        }}
      >
        {/* Search bar */}
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            height: 44,
            borderWidth: 1,
            borderColor: border,
            gap: 10,
          }}
        >
          <MaterialIcons name="search" size={20} color={textSecondary} />
          <TextInput
            placeholder="Search reminders..."
            placeholderTextColor={textSecondary + '80'}
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, color: text, fontSize: 15 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <FilterChip label="All" isActive={filterStatus === 'all'} onPress={() => setFilterStatus('all')} />
          <FilterChip label="Active" isActive={filterStatus === 'active'} onPress={() => setFilterStatus('active')} />
          <FilterChip label="Completed" isActive={filterStatus === 'completed'} onPress={() => setFilterStatus('completed')} />
          <View style={{ width: 1, backgroundColor: border, marginHorizontal: 4 }} />
          <FilterChip
            label="Time"
            isActive={selectedType === 'time'}
            onPress={() => setSelectedType(selectedType === 'time' ? null : 'time')}
          />
          <FilterChip
            label="Location"
            isActive={selectedType === 'location'}
            onPress={() => setSelectedType(selectedType === 'location' ? null : 'location')}
          />
        </ScrollView>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <FilterChip
              key={cat.value}
              label={cat.label}
              isActive={selectedCategory === cat.value}
              onPress={() =>
                setSelectedCategory(selectedCategory === cat.value ? null : cat.value)
              }
            />
          ))}
        </ScrollView>

        {/* Reminder list */}
        {filteredReminders.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={{ gap: 10 }}>
            {filteredReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
