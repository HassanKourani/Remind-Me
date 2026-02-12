import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format, isPast } from 'date-fns';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, Edit3, Trash2, Clock, MapPin, Bell, AlarmClock,
  CheckCircle, Circle, Tag, Repeat
} from 'lucide-react-native';
import { useReminder, useCompleteReminder, useDeleteReminder, useUncompleteReminder } from '@/hooks/useReminders';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low Priority',
  medium: 'Medium Priority',
  high: 'High Priority',
};

export default function ReminderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: reminder, isLoading } = useReminder(id!);
  const completeMutation = useCompleteReminder();
  const uncompleteMutation = useUncompleteReminder();
  const deleteMutation = useDeleteReminder();

  if (isLoading || !reminder) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-slate-900">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );
  }

  const isOverdue = reminder.type === 'time' && reminder.triggerAt && !reminder.isCompleted && isPast(new Date(reminder.triggerAt));

  const handleComplete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (reminder.isCompleted) {
      uncompleteMutation.mutate(id!);
    } else {
      completeMutation.mutate(id!);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Reminder', 'Are you sure you want to delete this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          deleteMutation.mutate(id!);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#64748b" />
        </Pressable>
        <View className="flex-row gap-4">
          <Pressable onPress={() => router.push(`/reminder/create?id=${id}`)}>
            <Edit3 size={22} color="#0ea5e9" />
          </Pressable>
          <Pressable onPress={handleDelete}>
            <Trash2 size={22} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="mt-6">
          {/* Priority bar */}
          <View
            style={{ backgroundColor: PRIORITY_COLORS[reminder.priority] }}
            className="mb-4 h-1 rounded-full"
          />

          {/* Title */}
          <Text
            className={`text-2xl font-bold ${
              reminder.isCompleted
                ? 'text-slate-400 line-through dark:text-slate-500'
                : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {reminder.title}
          </Text>

          {/* Notes */}
          {reminder.notes && (
            <Text className="mt-3 text-base leading-6 text-slate-600 dark:text-slate-400">
              {reminder.notes}
            </Text>
          )}

          {/* Badges row */}
          <View className="mt-4 flex-row flex-wrap gap-2">
            <Badge variant={isOverdue ? 'danger' : reminder.isCompleted ? 'success' : 'default'}>
              {reminder.isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Active'}
            </Badge>

            <Badge variant="warning">
              {PRIORITY_LABELS[reminder.priority]}
            </Badge>

            {reminder.deliveryMethod === 'alarm' && (
              <Badge variant="info">Alarm</Badge>
            )}

            {reminder.recurrenceRule && (
              <Badge variant="info">Recurring</Badge>
            )}
          </View>

          {/* Time info */}
          {reminder.type === 'time' && reminder.triggerAt && (
            <View className="mt-6 flex-row items-center rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <Clock size={22} color="#0ea5e9" />
              <View className="ml-3">
                <Text className="text-sm text-slate-500 dark:text-slate-400">Scheduled for</Text>
                <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {format(new Date(reminder.triggerAt), 'EEEE, MMMM d, yyyy')}
                </Text>
                <Text className="text-sm text-slate-600 dark:text-slate-400">
                  {format(new Date(reminder.triggerAt), 'h:mm a')}
                </Text>
              </View>
            </View>
          )}

          {/* Location info */}
          {reminder.type === 'location' && reminder.locationName && (
            <View className="mt-6 flex-row items-center rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <MapPin size={22} color="#0ea5e9" />
              <View className="ml-3">
                <Text className="text-sm text-slate-500 dark:text-slate-400">Location</Text>
                <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {reminder.locationName}
                </Text>
                <Text className="text-sm text-slate-600 dark:text-slate-400">
                  Trigger on: {reminder.triggerOn} • Radius: {reminder.radius}m
                </Text>
              </View>
            </View>
          )}

          {/* Completed info */}
          {reminder.isCompleted && reminder.completedAt && (
            <View className="mt-4 flex-row items-center rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
              <CheckCircle size={22} color="#22c55e" />
              <View className="ml-3">
                <Text className="text-sm text-green-600 dark:text-green-400">Completed</Text>
                <Text className="text-base text-green-700 dark:text-green-300">
                  {format(new Date(reminder.completedAt), 'MMM d, yyyy h:mm a')}
                </Text>
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View className="mt-8 gap-3">
            <Button
              variant={reminder.isCompleted ? 'outline' : 'primary'}
              size="lg"
              onPress={handleComplete}
            >
              {reminder.isCompleted ? 'Mark as Incomplete' : 'Mark as Complete'}
            </Button>

            <Button
              variant="danger"
              size="lg"
              onPress={handleDelete}
            >
              Delete Reminder
            </Button>
          </View>

          {/* Metadata */}
          <View className="mb-8 mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              Created: {format(new Date(reminder.createdAt), 'MMM d, yyyy h:mm a')}
            </Text>
            <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Last updated: {format(new Date(reminder.updatedAt), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
