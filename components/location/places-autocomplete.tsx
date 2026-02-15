import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useThemeColor } from '@/hooks/use-theme-color';
import { searchPlaces, getNearbyPlaces, getPlaceDetails } from '@/lib/places-api';
import type { PlacePrediction } from '@/lib/places-api';

interface PlacesAutocompleteProps {
  initialValue?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  countryCode?: string | null;
  onSelect: (lat: number, lng: number, address: string) => void;
}

export function PlacesAutocomplete({
  initialValue,
  userLocation,
  countryCode,
  onSelect,
}: PlacesAutocompleteProps) {
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');

  const [query, setQuery] = useState(initialValue ?? '');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nearbyLoadedRef = useRef(false);

  // Load nearby places when user location becomes available
  useEffect(() => {
    if (!userLocation || nearbyLoadedRef.current) return;
    nearbyLoadedRef.current = true;

    (async () => {
      const results = await getNearbyPlaces(userLocation);
      setNearbyPlaces(results);
    })();
  }, [userLocation]);

  const handleSearch = useCallback(
    (input: string) => {
      setQuery(input);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!input.trim()) {
        setPredictions([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsSearching(true);
        const results = await searchPlaces(
          input,
          userLocation ?? undefined,
          countryCode,
        );
        setPredictions(results);
        setIsSearching(false);
      }, 300);
    },
    [userLocation, countryCode],
  );

  const handleSelect = async (prediction: PlacePrediction) => {
    setQuery(prediction.description);
    setPredictions([]);
    setIsFocused(false);
    const details = await getPlaceDetails(prediction.placeId);
    if (details) {
      onSelect(details.lat, details.lng, details.address);
    }
  };

  // Show nearby places when focused with empty query, otherwise show search results
  const showNearby = isFocused && !query.trim() && nearbyPlaces.length > 0;
  const displayList = showNearby ? nearbyPlaces : predictions;

  return (
    <View style={{ gap: 4 }}>
      <View
        style={{
          backgroundColor: surface,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          height: 48,
          borderWidth: 1.5,
          borderColor: border,
          gap: 10,
        }}
      >
        <MaterialIcons name="search" size={20} color={textSecondary} />
        <TextInput
          placeholder="Search for a place..."
          placeholderTextColor={textSecondary + '80'}
          value={query}
          onChangeText={handleSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow tap on prediction
            setTimeout(() => setIsFocused(false), 200);
          }}
          style={{ flex: 1, color: text, fontSize: 15 }}
        />
        {isSearching && <ActivityIndicator size="small" color={primary} />}
        {query.length > 0 && !isSearching && (
          <Pressable
            onPress={() => {
              setQuery('');
              setPredictions([]);
            }}
            hitSlop={8}
          >
            <MaterialIcons name="close" size={18} color={textSecondary} />
          </Pressable>
        )}
      </View>

      {displayList.length > 0 && (
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            overflow: 'hidden',
          }}
        >
          {showNearby && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingTop: 10,
                paddingBottom: 4,
              }}
            >
              <MaterialIcons name="near-me" size={14} color={textSecondary} />
              <Animated.Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600' }}>
                Nearby
              </Animated.Text>
            </View>
          )}
          {displayList.map((prediction, index) => (
            <Pressable
              key={prediction.placeId}
              onPress={() => handleSelect(prediction)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 12,
                borderBottomWidth: index < displayList.length - 1 ? 1 : 0,
                borderBottomColor: border,
              }}
            >
              <MaterialIcons
                name={showNearby ? 'place' : 'location-on'}
                size={20}
                color={primary}
              />
              <View style={{ flex: 1 }}>
                <Animated.Text
                  numberOfLines={1}
                  style={{ color: text, fontSize: 14, fontWeight: '500' }}
                >
                  {prediction.mainText}
                </Animated.Text>
                <Animated.Text
                  numberOfLines={1}
                  style={{ color: textSecondary, fontSize: 12 }}
                >
                  {prediction.secondaryText}
                </Animated.Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
