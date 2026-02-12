import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { format, isPast } from 'date-fns';
import { Clock, MapPin, Bell, AlarmClock, Repeat } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Reminder } from '@/types/database';
import { Badge } from '@/components/ui/Badge';

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

interface ReminderCardProps {
  reminder: Reminder;
  onComplete?: (id: string) => void;
  onPress?: (id: string) => void;
  onLongPress?: (id: string) => void;
  selected?: boolean;
  selectionMode?: boolean;
}

export function ReminderCard({
  reminder,
  onComplete,
  onPress,
  onLongPress,
  selected,
  selectionMode,
}: ReminderCardProps) {
  const router = useRouter();
  const isOverdue = reminder.type === 'time' && reminder.triggerAt && !reminder.isCompleted && isPast(new Date(reminder.triggerAt));

  const handlePress = () => {
    if (selectionMode && onLongPress) {
      onLongPress(reminder.id);
      return;
    }
    if (onPress) {
      onPress(reminder.id);
    } else {
      router.push(`/reminder/${reminder.id}`);
    }
  };

  const handleComplete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete?.(reminder.id);
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={() => onLongPress?.(reminder.id)}
      className={`mb-2 flex-row overflow-hidden rounded-xl border bg-white dark:bg-slate-800 ${
        selected ? 'border-sky-500' : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      {/* Priority strip */}
      <View
        style={{ backgroundColor: PRIORITY_COLORS[reminder.priority] ?? '#f59e0b' }}
        className="w-1"
      />

      <View className="flex-1 flex-row items-center px-3 py-3">
        {/* Checkbox */}
        <Pressable onPress={handleComplete} className="mr-3">
          <View
            className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
              reminder.isCompleted
                ? 'border-green-500 bg-green-500'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          >
            {reminder.isCompleted && (
              <Text className="text-xs font-bold text-white">✓</Text>
            )}
          </View>
        </Pressable>

        {/* Content */}
        <View className="flex-1">
          <Text
            className={`text-base font-medium ${
              reminder.isCompleted
                ? 'text-slate-400 line-through dark:text-slate-500'
                : 'text-slate-800 dark:text-slate-100'
            }`}
            numberOfLines={1}
          >
            {reminder.title}
          </Text>

          {reminder.notes && (
            <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400" numberOfLines={1}>
              {reminder.notes}
            </Text>
          )}

          <View className="mt-1.5 flex-row flex-wrap items-center gap-1.5">
            {/* Time badge */}
            {reminder.type === 'time' && reminder.triggerAt && (
              <Badge variant={isOverdue ? 'danger' : 'default'}>
                <View className="flex-row items-center gap-1">
                  <Clock size={10} color={isOverdue ? '#ef4444' : '#64748b'} />
                  <Text className={`text-xs ${isOverdue ? 'text-red-600' : 'text-slate-600 dark:text-slate-400'}`}>
                    {format(new Date(reminder.triggerAt), 'MMM d, h:mm a')}
                  </Text>
                </View>
              </Badge>
            )}

            {/* Location badge */}
            {reminder.type === 'location' && reminder.locationName && (
              <Badge variant="info">
                <View className="flex-row items-center gap-1">
                  <MapPin size={10} color="#0ea5e9" />
                  <Text className="text-xs text-sky-600">{reminder.locationName}</Text>
                </View>
              </Badge>
            )}

            {/* Delivery method icon */}
            {reminder.deliveryMethod === 'alarm' && (
              <AlarmClock size={14} color="#f59e0b" />
            )}

            {/* Recurring indicator */}
            {reminder.recurrenceRule && (
              <Repeat size={14} color="#8b5cf6" />
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
