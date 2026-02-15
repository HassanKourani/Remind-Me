import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import MapView, { Circle, Marker } from 'react-native-maps';

import { useThemeColor } from '@/hooks/use-theme-color';
import { PlacesAutocomplete } from './places-autocomplete';
import type { LocationTrigger, LocationNotify } from '@/types/reminder';

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  address: string | null;
  radius: number;
  trigger: LocationTrigger;
  notify: LocationNotify;
  onLocationChange: (lat: number, lng: number, address: string) => void;
  onRadiusChange: (radius: number) => void;
  onTriggerChange: (trigger: LocationTrigger) => void;
  onNotifyChange: (notify: LocationNotify) => void;
}

const TRIGGER_OPTIONS: { value: LocationTrigger; label: string }[] = [
  { value: 'enter', label: 'Enter' },
  { value: 'leave', label: 'Leave' },
  { value: 'both', label: 'Both' },
];

const NOTIFY_OPTIONS: { value: LocationNotify; label: string }[] = [
  { value: 'once', label: 'Once' },
  { value: 'every_time', label: 'Every Time' },
];

const RADIUS_PRESETS = [100, 200, 500, 1000];

export function LocationPicker({
  lat,
  lng,
  address,
  radius,
  trigger,
  notify,
  onLocationChange,
  onRadiusChange,
  onTriggerChange,
  onNotifyChange,
}: LocationPickerProps) {
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const border = useThemeColor({}, 'border');

  return (
    <View style={{ gap: 16 }}>
      {/* Places search */}
      <View style={{ gap: 6 }}>
        <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
          Location
        </Animated.Text>
        <PlacesAutocomplete
          initialValue={address}
          onSelect={(lat, lng, addr) => onLocationChange(lat, lng, addr)}
        />
      </View>

      {/* Map */}
      {lat != null && lng != null && (
        <View
          style={{
            height: 200,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <MapView
            style={{ flex: 1 }}
            region={{
              latitude: lat,
              longitude: lng,
              latitudeDelta: (radius / 111000) * 4,
              longitudeDelta: (radius / 111000) * 4,
            }}
          >
            <Marker coordinate={{ latitude: lat, longitude: lng }} />
            <Circle
              center={{ latitude: lat, longitude: lng }}
              radius={radius}
              fillColor={primary + '20'}
              strokeColor={primary}
              strokeWidth={2}
            />
          </MapView>
        </View>
      )}

      {/* Radius selector */}
      <View style={{ gap: 6 }}>
        <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
          Radius: {radius >= 1000 ? `${(radius / 1000).toFixed(1)}km` : `${radius}m`}
        </Animated.Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {RADIUS_PRESETS.map((r) => {
            const isActive = radius === r;
            return (
              <Pressable
                key={r}
                onPress={() => onRadiusChange(r)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  backgroundColor: isActive ? primary + '15' : surface,
                  borderRadius: 10,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: isActive ? primary : border,
                }}
              >
                <Animated.Text
                  style={{
                    color: isActive ? primary : text,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </Animated.Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Trigger selector */}
      <View style={{ gap: 6 }}>
        <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
          Trigger when I
        </Animated.Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {TRIGGER_OPTIONS.map((opt) => {
            const isActive = trigger === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onTriggerChange(opt.value)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  backgroundColor: isActive ? primary + '15' : surface,
                  borderRadius: 12,
                  paddingVertical: 10,
                  borderWidth: 1.5,
                  borderColor: isActive ? primary : border,
                }}
              >
                <Animated.Text
                  style={{
                    color: isActive ? primary : text,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {opt.label}
                </Animated.Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Notify selector */}
      <View style={{ gap: 6 }}>
        <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
          Notify
        </Animated.Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {NOTIFY_OPTIONS.map((opt) => {
            const isActive = notify === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onNotifyChange(opt.value)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  backgroundColor: isActive ? primary + '15' : surface,
                  borderRadius: 12,
                  paddingVertical: 10,
                  borderWidth: 1.5,
                  borderColor: isActive ? primary : border,
                }}
              >
                <Animated.Text
                  style={{
                    color: isActive ? primary : text,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {opt.label}
                </Animated.Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
