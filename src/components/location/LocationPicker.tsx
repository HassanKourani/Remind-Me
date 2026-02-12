import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import MapView, { Marker, Circle, Region } from 'react-native-maps';
import { MapPin, Navigation, Search, X } from 'lucide-react-native';
import { searchPlaces, getPlaceDetails, reverseGeocode, PlacePrediction } from '@/services/location/placesApi';
import { getCurrentLocation } from '@/services/location/permissions';

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  radius?: number;
  locationName?: string | null;
  triggerOn?: 'enter' | 'exit' | 'both';
  isRecurringLocation?: boolean;
  onLocationChange: (data: {
    latitude: number;
    longitude: number;
    locationName: string;
    radius: number;
    triggerOn: 'enter' | 'exit' | 'both';
    isRecurringLocation: boolean;
  }) => void;
}

const RADIUS_OPTIONS = [100, 200, 500, 1000, 2000];

export function LocationPicker({
  latitude: initialLat,
  longitude: initialLng,
  radius: initialRadius = 200,
  locationName: initialName,
  triggerOn: initialTriggerOn = 'enter',
  isRecurringLocation: initialRecurring = false,
  onLocationChange,
}: LocationPickerProps) {
  const mapRef = useRef<MapView>(null);
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  } | null>(
    initialLat && initialLng
      ? { latitude: initialLat, longitude: initialLng, name: initialName ?? '' }
      : null
  );

  const [radius, setRadius] = useState(initialRadius);
  const [triggerOn, setTriggerOn] = useState<'enter' | 'exit' | 'both'>(initialTriggerOn);
  const [isRecurring, setIsRecurring] = useState(initialRecurring);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search
  const handleSearchChange = useCallback((text: string) => {
    setQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text.trim()) {
      setPredictions([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPlaces(text, selectedLocation ?? undefined);
        setPredictions(results);
        setShowResults(true);
      } catch (error) {
        console.error('[LocationPicker] Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [selectedLocation]);

  // Select a place from autocomplete
  const handleSelectPlace = async (prediction: PlacePrediction) => {
    setShowResults(false);
    setQuery(prediction.mainText);
    setIsSearching(true);

    try {
      const details = await getPlaceDetails(prediction.placeId);
      const location = {
        latitude: details.lat,
        longitude: details.lng,
        name: details.name,
      };
      setSelectedLocation(location);
      animateToLocation(details.lat, details.lng);
      emitChange(location, radius, triggerOn, isRecurring);
    } catch (error) {
      console.error('[LocationPicker] Place details error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle map tap
  const handleMapPress = async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    setSelectedLocation({ latitude, longitude, name: 'Loading...' });

    try {
      const result = await reverseGeocode(latitude, longitude);
      const name = result?.formattedAddress ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      const location = { latitude, longitude, name };
      setSelectedLocation(location);
      setQuery(name);
      emitChange(location, radius, triggerOn, isRecurring);
    } catch {
      const name = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      const location = { latitude, longitude, name };
      setSelectedLocation(location);
      setQuery(name);
      emitChange(location, radius, triggerOn, isRecurring);
    }
  };

  // Go to current location
  const handleCurrentLocation = async () => {
    const location = await getCurrentLocation();
    if (!location) return;

    const { latitude, longitude } = location.coords;
    animateToLocation(latitude, longitude);

    try {
      const result = await reverseGeocode(latitude, longitude);
      const name = result?.formattedAddress ?? 'Current Location';
      const loc = { latitude, longitude, name };
      setSelectedLocation(loc);
      setQuery(name);
      emitChange(loc, radius, triggerOn, isRecurring);
    } catch {
      const loc = { latitude, longitude, name: 'Current Location' };
      setSelectedLocation(loc);
      emitChange(loc, radius, triggerOn, isRecurring);
    }
  };

  const animateToLocation = (lat: number, lng: number) => {
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 500);
  };

  const emitChange = (
    location: { latitude: number; longitude: number; name: string },
    r: number,
    trigger: 'enter' | 'exit' | 'both',
    recurring: boolean
  ) => {
    onLocationChange({
      latitude: location.latitude,
      longitude: location.longitude,
      locationName: location.name,
      radius: r,
      triggerOn: trigger,
      isRecurringLocation: recurring,
    });
  };

  const handleRadiusChange = (r: number) => {
    setRadius(r);
    if (selectedLocation) {
      emitChange(selectedLocation, r, triggerOn, isRecurring);
    }
  };

  const handleTriggerOnChange = (mode: 'enter' | 'exit' | 'both') => {
    setTriggerOn(mode);
    if (selectedLocation) {
      emitChange(selectedLocation, radius, mode, isRecurring);
    }
  };

  const handleRecurringToggle = () => {
    const newVal = !isRecurring;
    setIsRecurring(newVal);
    if (selectedLocation) {
      emitChange(selectedLocation, radius, triggerOn, newVal);
    }
  };

  const initialRegion: Region = selectedLocation
    ? {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <View className="mt-2">
      {/* Search bar */}
      <View className="relative z-10">
        <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
          <Search size={18} color="#94a3b8" />
          <TextInput
            className="ml-2 flex-1 py-3 text-base text-slate-800 dark:text-slate-100"
            placeholder="Search for a place..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={handleSearchChange}
          />
          {isSearching && <ActivityIndicator size="small" color="#0ea5e9" />}
          {query.length > 0 && !isSearching && (
            <Pressable onPress={() => { setQuery(''); setPredictions([]); setShowResults(false); }}>
              <X size={18} color="#94a3b8" />
            </Pressable>
          )}
        </View>

        {/* Autocomplete results */}
        {showResults && predictions.length > 0 && (
          <View className="absolute left-0 right-0 top-14 z-20 max-h-48 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.placeId}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectPlace(item)}
                  className="border-b border-slate-100 px-4 py-3 dark:border-slate-700"
                >
                  <Text className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {item.mainText}
                  </Text>
                  <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {item.secondaryText}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        )}
      </View>

      {/* Map */}
      <View className="mt-3 h-64 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {selectedLocation && (
            <>
              <Marker
                coordinate={{
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                }}
                title={selectedLocation.name}
              />
              <Circle
                center={{
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                }}
                radius={radius}
                strokeColor="rgba(14, 165, 233, 0.5)"
                fillColor="rgba(14, 165, 233, 0.1)"
                strokeWidth={2}
              />
            </>
          )}
        </MapView>

        {/* Current location button */}
        <Pressable
          onPress={handleCurrentLocation}
          className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md dark:bg-slate-800"
        >
          <Navigation size={20} color="#0ea5e9" />
        </Pressable>
      </View>

      {/* Selected location name */}
      {selectedLocation && (
        <View className="mt-2 flex-row items-center">
          <MapPin size={14} color="#0ea5e9" />
          <Text className="ml-1 flex-1 text-sm text-slate-600 dark:text-slate-400" numberOfLines={1}>
            {selectedLocation.name}
          </Text>
        </View>
      )}

      {/* Radius selector */}
      <Text className="mb-2 mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">
        Radius
      </Text>
      <View className="flex-row gap-2">
        {RADIUS_OPTIONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => handleRadiusChange(r)}
            className={`flex-1 items-center rounded-lg py-2 ${
              radius === r
                ? 'bg-sky-500'
                : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                radius === r ? 'text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Trigger mode */}
      <Text className="mb-2 mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">
        Trigger when
      </Text>
      <View className="flex-row gap-2">
        {(['enter', 'exit', 'both'] as const).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => handleTriggerOnChange(mode)}
            className={`flex-1 items-center rounded-lg py-2.5 ${
              triggerOn === mode
                ? 'bg-sky-500'
                : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            <Text
              className={`text-sm font-medium capitalize ${
                triggerOn === mode ? 'text-white' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {mode === 'enter' ? 'Arrive' : mode === 'exit' ? 'Leave' : 'Both'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Recurring toggle */}
      <Pressable
        onPress={handleRecurringToggle}
        className="mt-4 flex-row items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
      >
        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Repeat every time
        </Text>
        <View
          className={`h-6 w-11 items-center rounded-full px-0.5 ${
            isRecurring ? 'bg-sky-500 justify-end' : 'bg-slate-300 justify-start dark:bg-slate-600'
          }`}
          style={{ flexDirection: 'row', alignItems: isRecurring ? 'center' : 'center', justifyContent: isRecurring ? 'flex-end' : 'flex-start' }}
        >
          <View className="h-5 w-5 rounded-full bg-white shadow" />
        </View>
      </Pressable>
    </View>
  );
}
