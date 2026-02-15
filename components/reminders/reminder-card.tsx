import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

import { useThemeColor } from '@/hooks/use-theme-color';
import type { Reminder } from '@/types/reminder';
import { CATEGORIES, PRIORITIES } from '@/types/reminder';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ReminderCardProps {
  reminder: Reminder;
  onToggleComplete: (id: string) => void;
}

export function ReminderCard({ reminder, onToggleComplete }: ReminderCardProps) {
  const router = useRouter();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const border = useThemeColor({}, 'border');

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const priorityInfo = PRIORITIES.find((p) => p.value === reminder.priority);
  const categoryInfo = CATEGORIES.find((c) => c.value === reminder.category);
  const priorityColor = priorityInfo?.color ?? '#6B7280';

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return '';
    const d = new Date(dateTime);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${time}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${time}`;
  };

  const subtitle =
    reminder.type === 'time'
      ? formatDateTime(reminder.date_time)
      : reminder.location_address ?? 'Location reminder';

  return (
    <AnimatedPressable
      onPress={() => router.push(`/reminder/${reminder.id}`)}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      style={[
        {
          backgroundColor: surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: border,
          flexDirection: 'row',
          overflow: 'hidden',
        },
        animatedStyle,
      ]}
    >
      {/* Priority accent bar */}
      <View style={{ width: 4, backgroundColor: priorityColor }} />

      <View style={{ flex: 1, padding: 14, gap: 8 }}>
        {/* Top row: type icon + title + checkbox */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MaterialIcons
            name={reminder.type === 'time' ? 'schedule' : 'location-on'}
            size={18}
            color={textSecondary}
          />
          <Animated.Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: text,
              fontSize: 15,
              fontWeight: '600',
              textDecorationLine: reminder.is_completed ? 'line-through' : 'none',
              opacity: reminder.is_completed ? 0.5 : 1,
            }}
          >
            {reminder.title}
          </Animated.Text>
          <Pressable
            onPress={() => onToggleComplete(reminder.id)}
            hitSlop={12}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: reminder.is_completed ? priorityColor : border,
              backgroundColor: reminder.is_completed ? priorityColor : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {reminder.is_completed && (
              <MaterialIcons name="check" size={14} color="#FFFFFF" />
            )}
          </Pressable>
        </View>

        {/* Notes preview */}
        {reminder.notes ? (
          <Animated.Text
            numberOfLines={1}
            style={{ color: textSecondary, fontSize: 13, marginLeft: 28 }}
          >
            {reminder.notes}
          </Animated.Text>
        ) : null}

        {/* Bottom row: category pill + subtitle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 28 }}>
          {categoryInfo && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: categoryInfo.color + '15',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <MaterialIcons
                name={categoryInfo.icon as keyof typeof MaterialIcons.glyphMap}
                size={12}
                color={categoryInfo.color}
              />
              <Animated.Text style={{ color: categoryInfo.color, fontSize: 11, fontWeight: '600' }}>
                {categoryInfo.label}
              </Animated.Text>
            </View>
          )}
          {subtitle ? (
            <Animated.Text numberOfLines={1} style={{ color: textSecondary, fontSize: 12, flex: 1 }}>
              {subtitle}
            </Animated.Text>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}
