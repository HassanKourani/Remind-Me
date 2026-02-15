import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { TypeSelector } from '@/components/reminders/type-selector';
import { PrioritySelector } from '@/components/reminders/priority-selector';
import { CategorySelector } from '@/components/reminders/category-selector';
import { RepeatSelector } from '@/components/reminders/repeat-selector';
import { LocationPicker } from '@/components/location/location-picker';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/stores/auth-store';
import { useReminderStore } from '@/stores/reminder-store';
import { useToastStore } from '@/stores/toast-store';
import { useNetworkStore } from '@/stores/network-store';
import { pushToCloud } from '@/lib/sync-service';
import { scheduleTimeReminder } from '@/lib/notifications';
import { startGeofencing } from '@/lib/geofencing';
import type {
  Category,
  LocationNotify,
  LocationTrigger,
  Priority,
  ReminderType,
  RepeatType,
} from '@/types/reminder';

export default function CreateReminderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const isGuest = useAuthStore((s) => s.isGuest);
  const user = useAuthStore((s) => s.user);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const createReminder = useReminderStore((s) => s.createReminder);
  const addToast = useToastStore((s) => s.addToast);

  const ownerId = isGuest ? 'guest' : user?.id ?? '';

  // Form state
  const [type, setType] = useState<ReminderType>('time');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('personal');
  const [titleError, setTitleError] = useState<string | null>(null);

  // Time fields
  const [dateTime, setDateTime] = useState(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeatConfig, setRepeatConfig] = useState<{
    type: RepeatType;
    interval: number | null;
    unit: 'days' | 'weeks' | null;
    days: number[] | null;
  }>({ type: 'none', interval: null, unit: null, days: null });

  // Location fields
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [locationRadius, setLocationRadius] = useState(200);
  const [locationTrigger, setLocationTrigger] = useState<LocationTrigger>('enter');
  const [locationNotify, setLocationNotify] = useState<LocationNotify>('every_time');

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }

    setIsSaving(true);
    try {
      const reminder = await createReminder(
        {
          owner_id: ownerId,
          type,
          title: title.trim(),
          notes: notes.trim() || null,
          priority,
          category,
          date_time: type === 'time' ? dateTime.toISOString() : null,
          repeat_type: type === 'time' ? repeatConfig.type : 'none',
          repeat_interval: type === 'time' ? repeatConfig.interval : null,
          repeat_unit: type === 'time' ? repeatConfig.unit : null,
          repeat_days: type === 'time' ? repeatConfig.days : null,
          location_lat: type === 'location' ? locationLat : null,
          location_lng: type === 'location' ? locationLng : null,
          location_address: type === 'location' ? locationAddress : null,
          location_radius: type === 'location' ? locationRadius : null,
          location_trigger: type === 'location' ? locationTrigger : null,
          location_notify: type === 'location' ? locationNotify : null,
        },
        isGuest,
      );

      // Schedule notification or geofence
      if (type === 'time') {
        await scheduleTimeReminder(reminder);
      } else if (type === 'location' && locationLat && locationLng) {
        await startGeofencing(reminder);
      }

      // Push to cloud if signed in and online
      if (!isGuest && user?.id && isOnline) {
        pushToCloud(user.id).catch(() => {});
      }

      addToast({ type: 'success', title: 'Reminder created' });
      router.back();
    } catch {
      addToast({ type: 'error', title: 'Failed to create reminder' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor }}
    >
      <PageHeader onBack={() => router.back()}>
        <View style={{ gap: 4 }}>
          <Animated.Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>
            New Reminder
          </Animated.Text>
          <Animated.Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
            What do you need to remember?
          </Animated.Text>
        </View>
      </PageHeader>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 40,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type selector */}
        <View style={{ gap: 6 }}>
          <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
            Type
          </Animated.Text>
          <TypeSelector value={type} onChange={setType} />
        </View>

        {/* Title */}
        <Input
          label="Title"
          placeholder="Enter reminder title"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            setTitleError(null);
          }}
          error={titleError}
        />

        {/* Notes */}
        <Input
          label="Notes (optional)"
          placeholder="Add some details..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }}
        />

        {/* Priority */}
        <View style={{ gap: 6 }}>
          <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
            Priority
          </Animated.Text>
          <PrioritySelector value={priority} onChange={setPriority} />
        </View>

        {/* Category */}
        <View style={{ gap: 6 }}>
          <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
            Category
          </Animated.Text>
          <CategorySelector value={category} onChange={setCategory} />
        </View>

        {/* Time-specific fields */}
        {type === 'time' && (
          <View style={{ gap: 16 }}>
            {/* Date picker */}
            <View style={{ gap: 6 }}>
              <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
                Date & Time
              </Animated.Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    flex: 1,
                    backgroundColor: useThemeColor({}, 'surface'),
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: useThemeColor({}, 'border'),
                  }}
                >
                  <Animated.Text style={{ color: useThemeColor({}, 'text'), fontSize: 15 }}>
                    {dateTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Animated.Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowTimePicker(true)}
                  style={{
                    flex: 1,
                    backgroundColor: useThemeColor({}, 'surface'),
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: useThemeColor({}, 'border'),
                  }}
                >
                  <Animated.Text style={{ color: useThemeColor({}, 'text'), fontSize: 15 }}>
                    {dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Animated.Text>
                </Pressable>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  value={dateTime}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      const newDate = new Date(dateTime);
                      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      setDateTime(newDate);
                    }
                  }}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={dateTime}
                  mode="time"
                  onChange={(_, date) => {
                    setShowTimePicker(false);
                    if (date) {
                      const newDate = new Date(dateTime);
                      newDate.setHours(date.getHours(), date.getMinutes());
                      setDateTime(newDate);
                    }
                  }}
                />
              )}
            </View>

            {/* Repeat */}
            <RepeatSelector value={repeatConfig} onChange={setRepeatConfig} />
          </View>
        )}

        {/* Location-specific fields */}
        {type === 'location' && (
          <LocationPicker
            lat={locationLat}
            lng={locationLng}
            address={locationAddress}
            radius={locationRadius}
            trigger={locationTrigger}
            notify={locationNotify}
            onLocationChange={(lat, lng, address) => {
              setLocationLat(lat);
              setLocationLng(lng);
              setLocationAddress(address);
            }}
            onRadiusChange={setLocationRadius}
            onTriggerChange={setLocationTrigger}
            onNotifyChange={setLocationNotify}
          />
        )}

        {/* Save button */}
        <View style={{ marginTop: 8 }}>
          <Button variant="filled" size="lg" loading={isSaving} onPress={handleSave}>
            Create Reminder
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
