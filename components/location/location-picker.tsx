import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';

import { useThemeColor } from '@/hooks/use-theme-color';
import { CustomSlider } from '@/components/ui/custom-slider';
import { PlacesAutocomplete } from './places-autocomplete';
import { reverseGeocode } from '@/lib/places-api';
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

const TRIGGER_OPTIONS: {
  value: LocationTrigger;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { value: 'enter', label: 'Arrive', icon: 'login' },
  { value: 'leave', label: 'Leave', icon: 'logout' },
  { value: 'both', label: 'Both', icon: 'swap-horiz' },
];

const NOTIFY_OPTIONS: {
  value: LocationNotify;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { value: 'once', label: 'Once', icon: 'looks-one' },
  { value: 'every_time', label: 'Every Time', icon: 'all-inclusive' },
];

// Snap slider value to nice round numbers
function snapRadius(value: number): number {
  if (value <= 150) return 100;
  if (value <= 300) return 200;
  if (value <= 400) return 300;
  if (value <= 600) return 500;
  if (value <= 800) return 750;
  if (value <= 1250) return 1000;
  if (value <= 1750) return 1500;
  return 2000;
}

function formatRadius(radius: number): string {
  if (radius >= 1000) return `${(radius / 1000).toFixed(radius % 1000 === 0 ? 0 : 1)} km`;
  return `${radius} m`;
}

// Default fallback (San Francisco)
const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

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
  const background = useThemeColor({}, 'background');

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [sliderValue, setSliderValue] = useState(radius);

  // Get user location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setUserLocation(coords);

          // Get country code for search biasing
          const geo = await reverseGeocode(coords.lat, coords.lng);
          if (geo.countryCode) {
            setCountryCode(geo.countryCode);
          }
        }
      } catch {
        // Location unavailable, use default
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const handleMapPress = async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const geo = await reverseGeocode(latitude, longitude);
    onLocationChange(latitude, longitude, geo.address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
  };

  // Determine map region
  const mapRegion = lat != null && lng != null
    ? {
        latitude: lat,
        longitude: lng,
        latitudeDelta: (radius / 111000) * 4,
        longitudeDelta: (radius / 111000) * 4,
      }
    : userLocation
      ? {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : DEFAULT_REGION;

  return (
    <View style={{ gap: 16 }}>
      {/* Places search */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialIcons name="search" size={16} color={textSecondary} />
          <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
            Location
          </Animated.Text>
        </View>
        <PlacesAutocomplete
          initialValue={address}
          userLocation={userLocation}
          countryCode={countryCode}
          onSelect={(lat, lng, addr) => onLocationChange(lat, lng, addr)}
        />
      </View>

      {/* Map — always visible */}
      <View
        style={{
          height: 220,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: border,
        }}
      >
        {loadingLocation ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: surface }}>
            <ActivityIndicator size="small" color={primary} />
            <Animated.Text style={{ color: textSecondary, fontSize: 13, marginTop: 8 }}>
              Getting your location...
            </Animated.Text>
          </View>
        ) : (
          <MapView
            style={{ flex: 1 }}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            region={mapRegion}
            showsUserLocation
            showsMyLocationButton
            onPress={handleMapPress}
          >
            {lat != null && lng != null && (
              <>
                <Marker coordinate={{ latitude: lat, longitude: lng }} />
                <Circle
                  center={{ latitude: lat, longitude: lng }}
                  radius={radius}
                  fillColor={primary + '20'}
                  strokeColor={primary}
                  strokeWidth={2}
                />
              </>
            )}
          </MapView>
        )}
      </View>

      {/* Tap hint */}
      {lat == null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <MaterialIcons name="touch-app" size={16} color={textSecondary + '99'} />
          <Animated.Text style={{ color: textSecondary, fontSize: 13, textAlign: 'center' }}>
            Tap the map or search to select a location
          </Animated.Text>
        </View>
      )}

      {/* Range slider */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="radar" size={16} color={textSecondary} />
            <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
              Range
            </Animated.Text>
          </View>
          <View
            style={{
              backgroundColor: primary + '15',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Animated.Text style={{ color: primary, fontSize: 13, fontWeight: '600' }}>
              {formatRadius(radius)}
            </Animated.Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MaterialIcons name="circle" size={10} color={textSecondary + '60'} />
          <View style={{ flex: 1 }}>
            <CustomSlider
              minimumValue={100}
              maximumValue={2000}
              value={sliderValue}
              onValueChange={(v) => {
                const snapped = snapRadius(v);
                setSliderValue(v);
                onRadiusChange(snapped);
              }}
              onSlidingComplete={(v) => {
                const snapped = snapRadius(v);
                setSliderValue(snapped);
                onRadiusChange(snapped);
              }}
              activeTrackColor={primary}
              trackColor={border}
              thumbColor={primary}
            />
          </View>
          <MaterialIcons name="circle" size={18} color={textSecondary + '60'} />
        </View>
      </View>

      {/* Trigger selector */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialIcons name="notifications-active" size={16} color={textSecondary} />
          <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
            Trigger when I
          </Animated.Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {TRIGGER_OPTIONS.map((opt) => {
            const isActive = trigger === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onTriggerChange(opt.value)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: isActive ? primary + '15' : surface,
                  borderRadius: 12,
                  paddingVertical: 10,
                  borderWidth: 1.5,
                  borderColor: isActive ? primary : border,
                }}
              >
                <MaterialIcons
                  name={opt.icon}
                  size={18}
                  color={isActive ? primary : textSecondary}
                />
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
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialIcons name="repeat" size={16} color={textSecondary} />
          <Animated.Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>
            Notify
          </Animated.Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {NOTIFY_OPTIONS.map((opt) => {
            const isActive = notify === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onNotifyChange(opt.value)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: isActive ? primary + '15' : surface,
                  borderRadius: 12,
                  paddingVertical: 10,
                  borderWidth: 1.5,
                  borderColor: isActive ? primary : border,
                }}
              >
                <MaterialIcons
                  name={opt.icon}
                  size={18}
                  color={isActive ? primary : textSecondary}
                />
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
