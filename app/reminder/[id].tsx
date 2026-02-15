import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { KeyboardDismissButton } from '@/components/ui/keyboard-dismiss-button';
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
import { scheduleTimeReminder, cancelNotification } from '@/lib/notifications';
import { startGeofencing, stopGeofencing } from '@/lib/geofencing';
import { getReminderById } from '@/lib/reminder-repository';
import type {
  Category,
  LocationNotify,
  LocationTrigger,
  Priority,
  Reminder,
  ReminderType,
  RepeatType,
} from '@/types/reminder';

export default function EditReminderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const border = useThemeColor({}, 'border');

  const isGuest = useAuthStore((s) => s.isGuest);
  const user = useAuthStore((s) => s.user);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const updateReminder = useReminderStore((s) => s.updateReminder);
  const deleteReminder = useReminderStore((s) => s.deleteReminder);
  const addToast = useToastStore((s) => s.addToast);

  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Form state
  const [type, setType] = useState<ReminderType>('time');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('personal');
  const [titleError, setTitleError] = useState<string | null>(null);

  // Time fields
  const [dateTime, setDateTime] = useState(new Date());
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

  const sectionCard = {
    backgroundColor: surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: border,
  } as const;

  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await getReminderById(id);
      if (r) {
        setReminder(r);
        setType(r.type);
        setTitle(r.title);
        setNotes(r.notes ?? '');
        setPriority(r.priority);
        setCategory(r.category);
        if (r.date_time) setDateTime(new Date(r.date_time));
        setRepeatConfig({
          type: r.repeat_type,
          interval: r.repeat_interval,
          unit: r.repeat_unit,
          days: r.repeat_days,
        });
        setLocationLat(r.location_lat);
        setLocationLng(r.location_lng);
        setLocationAddress(r.location_address);
        setLocationRadius(r.location_radius ?? 200);
        setLocationTrigger(r.location_trigger ?? 'enter');
        setLocationNotify(r.location_notify ?? 'every_time');
      }
      setIsLoaded(true);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    if (!id) return;

    setIsSaving(true);
    try {
      // Cancel existing notification/geofence
      if (reminder) {
        if (reminder.type === 'time') {
          await cancelNotification(reminder.id);
        } else {
          await stopGeofencing(reminder.id);
        }
      }

      await updateReminder(
        id,
        {
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

      // Reschedule
      const updated = await getReminderById(id);
      if (updated) {
        if (updated.type === 'time') {
          await scheduleTimeReminder(updated);
        } else if (updated.type === 'location' && updated.location_lat && updated.location_lng) {
          await startGeofencing(updated);
        }
      }

      if (!isGuest && user?.id && isOnline) {
        pushToCloud(user.id).catch(() => {});
      }

      addToast({ type: 'success', title: 'Reminder updated' });
      router.back();
    } catch {
      addToast({ type: 'error', title: 'Failed to update reminder' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Reminder', 'Are you sure you want to delete this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          // Cancel notification/geofence
          if (reminder) {
            if (reminder.type === 'time') {
              await cancelNotification(reminder.id);
            } else {
              await stopGeofencing(reminder.id);
            }
          }
          await deleteReminder(id, isGuest);
          if (!isGuest && user?.id && isOnline) {
            pushToCloud(user.id).catch(() => {});
          }
          addToast({ type: 'success', title: 'Reminder deleted' });
          router.back();
        },
      },
    ]);
  };

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor }} />;
  }

  if (!reminder) {
    return (
      <View style={{ flex: 1, backgroundColor, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.Text style={{ color: textSecondary, fontSize: 16 }}>
          Reminder not found
        </Animated.Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor }}
    >
      <PageHeader onBack={() => router.back()}>
        <View style={{ gap: 4 }}>
          <Animated.Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>
            Edit Reminder
          </Animated.Text>
          <Animated.Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
            Update your reminder details
          </Animated.Text>
        </View>
      </PageHeader>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 40,
          gap: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section 1: Type */}
        <View style={sectionCard}>
          <View style={{ gap: 6 }}>
            <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
              Type
            </Animated.Text>
            <TypeSelector value={type} onChange={setType} />
          </View>
        </View>

        {/* Section 2: Title + Notes */}
        <View style={[sectionCard, { gap: 16 }]}>
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
          <Input
            label="Notes (optional)"
            placeholder="Add some details..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Section 3: Priority + Category */}
        <View style={[sectionCard, { gap: 16 }]}>
          <View style={{ gap: 6 }}>
            <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
              Priority
            </Animated.Text>
            <PrioritySelector value={priority} onChange={setPriority} />
          </View>
          <View style={{ gap: 6 }}>
            <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
              Category
            </Animated.Text>
            <CategorySelector value={category} onChange={setCategory} />
          </View>
        </View>

        {/* Section 4: Time-specific fields */}
        {type === 'time' && (
          <View style={[sectionCard, { gap: 16 }]}>
            <View style={{ gap: 6 }}>
              <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
                Date & Time
              </Animated.Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: backgroundColor,
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: border,
                  }}
                >
                  <MaterialIcons name="calendar-today" size={18} color={textSecondary} />
                  <Animated.Text style={{ color: text, fontSize: 15 }}>
                    {dateTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Animated.Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowTimePicker(true)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: backgroundColor,
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: border,
                  }}
                >
                  <MaterialIcons name="access-time" size={18} color={textSecondary} />
                  <Animated.Text style={{ color: text, fontSize: 15 }}>
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

        {/* Section 4: Location-specific fields */}
        {type === 'location' && (
          <View style={[sectionCard, { padding: 0 }]}>
            <View style={{ padding: 16 }}>
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
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={{ gap: 12, marginTop: 8 }}>
          <Button variant="filled" size="lg" loading={isSaving} onPress={handleSave}>
            Save Changes
          </Button>
          <Button
            variant="ghost"
            size="md"
            onPress={handleDelete}
          >
            Delete Reminder
          </Button>
        </View>
      </ScrollView>

      <KeyboardDismissButton />
    </KeyboardAvoidingView>
  );
}
