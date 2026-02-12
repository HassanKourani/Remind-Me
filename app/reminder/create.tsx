import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { X, Clock, MapPin, Tag } from 'lucide-react-native';
import { Button, Input } from '@/components/ui';
import { LocationPicker } from '@/components/location/LocationPicker';
import { useCreateReminder, useUpdateReminder, useReminder, useReminderCount } from '@/hooks/useReminders';
import { useAuthStore } from '@/stores/authStore';
import { showInterstitialAd } from '@/services/ads/adService';
import { Priority, DeliveryMethod } from '@/types/database';
import { getDatabase } from '@/services/database/sqlite';
import { useQuery } from '@tanstack/react-query';

const FREE_REMINDER_LIMIT = 5;

const createReminderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  notes: z.string().max(1000).optional(),
  type: z.enum(['time', 'location']),
  triggerAt: z.string().optional(),
  recurrenceRule: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius: z.number().min(100).max(2000).optional(),
  locationName: z.string().optional(),
  triggerOn: z.enum(['enter', 'exit', 'both']).optional(),
  isRecurringLocation: z.boolean().optional(),
  deliveryMethod: z.enum(['notification', 'alarm']).optional(),
  categoryId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
}).refine(
  (data) => {
    if (data.type === 'time') {
      if (!data.triggerAt) return false;
      return new Date(data.triggerAt) > new Date();
    }
    return true;
  },
  { message: 'A future date and time must be provided', path: ['triggerAt'] }
).refine(
  (data) => {
    if (data.type === 'location') {
      return data.latitude !== undefined && data.longitude !== undefined;
    }
    return true;
  },
  { message: 'A location must be selected', path: ['latitude'] }
);

type CreateReminderForm = z.infer<typeof createReminderSchema>;

const PRIORITIES: { key: Priority; label: string; color: string }[] = [
  { key: 'low', label: 'Low', color: '#22c55e' },
  { key: 'medium', label: 'Medium', color: '#f59e0b' },
  { key: 'high', label: 'High', color: '#ef4444' },
];

const DELIVERY_METHODS: { key: DeliveryMethod; label: string }[] = [
  { key: 'notification', label: 'Notification' },
  { key: 'alarm', label: 'Alarm' },
];

export default function CreateReminderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;

  const { user } = useAuthStore();
  const createMutation = useCreateReminder();
  const updateMutation = useUpdateReminder();
  const { data: existingReminder } = useReminder(params.id ?? '');
  const { data: activeCount } = useReminderCount();

  // Load categories
  const { data: categories } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const db = await getDatabase();
      return db.getAllAsync<{ id: string; name: string; color: string; icon: string }>(
        'SELECT id, name, color, icon FROM categories WHERE user_id = ? ORDER BY sort_order ASC',
        [user!.id]
      );
    },
    enabled: !!user,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(Date.now() + 3600000));

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateReminderForm>({
    resolver: zodResolver(createReminderSchema),
    defaultValues: {
      title: existingReminder?.title ?? '',
      notes: existingReminder?.notes ?? '',
      type: existingReminder?.type ?? 'time',
      triggerAt: existingReminder?.triggerAt ?? new Date(Date.now() + 3600000).toISOString(),
      deliveryMethod: existingReminder?.deliveryMethod ?? 'notification',
      categoryId: existingReminder?.categoryId ?? undefined,
      priority: existingReminder?.priority ?? 'medium',
    },
  });

  const reminderType = watch('type');
  const selectedPriority = watch('priority');
  const selectedDelivery = watch('deliveryMethod');
  const selectedCategory = watch('categoryId');

  const onSubmit = async (data: CreateReminderForm) => {
    // Check free tier limit
    if (!isEditing && !user?.isPremium && (activeCount ?? 0) >= FREE_REMINDER_LIMIT) {
      Alert.alert(
        'Reminder Limit Reached',
        `Free accounts are limited to ${FREE_REMINDER_LIMIT} active reminders. Upgrade to Premium for unlimited reminders.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/premium/') },
        ]
      );
      return;
    }

    try {
      if (isEditing && params.id) {
        await updateMutation.mutateAsync({ id: params.id, input: data });
      } else {
        await createMutation.mutateAsync(data);
        // Show interstitial ad for free users after creation
        if (!user?.isPremium) {
          try { await showInterstitialAd(); } catch {}
        }
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to save reminder');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <Pressable onPress={() => router.back()}>
          <X size={24} color="#64748b" />
        </Pressable>
        <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {isEditing ? 'Edit Reminder' : 'New Reminder'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        <View className="mt-4">
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Title"
                placeholder="What do you need to remember?"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.title?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Notes (optional)"
                placeholder="Add any extra details..."
                multiline
                numberOfLines={3}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          {/* Type selector */}
          <Text className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Reminder Type
          </Text>
          <View className="mb-4 flex-row gap-2">
            <Pressable
              onPress={() => setValue('type', 'time')}
              className={`flex-1 flex-row items-center justify-center rounded-xl border py-3 ${
                reminderType === 'time'
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <Clock size={18} color={reminderType === 'time' ? '#0ea5e9' : '#94a3b8'} />
              <Text className={`ml-2 font-medium ${
                reminderType === 'time' ? 'text-sky-600' : 'text-slate-500 dark:text-slate-400'
              }`}>
                Time
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!user?.isPremium) {
                  Alert.alert('Premium Feature', 'Location reminders require a premium subscription.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Upgrade', onPress: () => router.push('/premium/') },
                  ]);
                  return;
                }
                setValue('type', 'location');
              }}
              className={`flex-1 flex-row items-center justify-center rounded-xl border py-3 ${
                reminderType === 'location'
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <MapPin size={18} color={reminderType === 'location' ? '#0ea5e9' : '#94a3b8'} />
              <Text className={`ml-2 font-medium ${
                reminderType === 'location' ? 'text-sky-600' : 'text-slate-500 dark:text-slate-400'
              }`}>
                Location
              </Text>
              {!user?.isPremium && (
                <Text className="ml-1 text-xs text-amber-500">PRO</Text>
              )}
            </Pressable>
          </View>

          {/* Time picker section */}
          {reminderType === 'time' && (
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                Date & Time
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                >
                  <Text className="text-base text-slate-800 dark:text-slate-100">
                    {selectedDate.toLocaleDateString()}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowTimePicker(true)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                >
                  <Text className="text-base text-slate-800 dark:text-slate-100">
                    {selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Pressable>
              </View>
              {errors.triggerAt && (
                <Text className="mt-1 text-sm text-red-500">{errors.triggerAt.message}</Text>
              )}

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      const newDate = new Date(selectedDate);
                      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      setSelectedDate(newDate);
                      setValue('triggerAt', newDate.toISOString());
                    }
                  }}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  onChange={(_, date) => {
                    setShowTimePicker(false);
                    if (date) {
                      const newDate = new Date(selectedDate);
                      newDate.setHours(date.getHours(), date.getMinutes());
                      setSelectedDate(newDate);
                      setValue('triggerAt', newDate.toISOString());
                    }
                  }}
                />
              )}
            </View>
          )}

          {/* Location section */}
          {reminderType === 'location' && (
            <View className="mb-4">
              <LocationPicker
                latitude={existingReminder?.latitude}
                longitude={existingReminder?.longitude}
                radius={existingReminder?.radius ?? 200}
                locationName={existingReminder?.locationName}
                triggerOn={existingReminder?.triggerOn ?? 'enter'}
                isRecurringLocation={existingReminder?.isRecurringLocation ?? false}
                onLocationChange={(data) => {
                  setValue('latitude', data.latitude);
                  setValue('longitude', data.longitude);
                  setValue('locationName', data.locationName);
                  setValue('radius', data.radius);
                  setValue('triggerOn', data.triggerOn);
                  setValue('isRecurringLocation', data.isRecurringLocation);
                }}
              />
              {errors.latitude && (
                <Text className="mt-1 text-sm text-red-500">{errors.latitude.message}</Text>
              )}
            </View>
          )}

          {/* Category selector */}
          <Text className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Category
          </Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {(categories ?? []).map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setValue('categoryId', selectedCategory === cat.id ? undefined : cat.id)}
                className={`flex-row items-center rounded-full border px-3 py-2 ${
                  selectedCategory === cat.id
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <View style={{ backgroundColor: cat.color }} className="h-3 w-3 rounded-full" />
                <Text className={`ml-2 text-sm ${
                  selectedCategory === cat.id
                    ? 'font-medium text-sky-600'
                    : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Priority */}
          <Text className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Priority
          </Text>
          <View className="mb-4 flex-row gap-2">
            {PRIORITIES.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => setValue('priority', p.key)}
                className={`flex-1 items-center rounded-xl border py-3 ${
                  selectedPriority === p.key
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <View style={{ backgroundColor: p.color }} className="mb-1 h-3 w-3 rounded-full" />
                <Text className={`text-sm ${
                  selectedPriority === p.key ? 'font-medium text-sky-600' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Delivery method */}
          <Text className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Delivery Method
          </Text>
          <View className="mb-6 flex-row gap-2">
            {DELIVERY_METHODS.map((d) => (
              <Pressable
                key={d.key}
                onPress={() => setValue('deliveryMethod', d.key)}
                className={`flex-1 items-center rounded-xl border py-3 ${
                  selectedDelivery === d.key
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <Text className={`text-sm ${
                  selectedDelivery === d.key ? 'font-medium text-sky-600' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {d.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit(onSubmit)}
            loading={createMutation.isPending || updateMutation.isPending}
            className="mb-8"
          >
            {isEditing ? 'Save Changes' : 'Create Reminder'}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
