import { useCallback, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useThemeColor } from '@/hooks/use-theme-color';
import { searchPlaces, getPlaceDetails } from '@/lib/places-api';
import type { PlacePrediction } from '@/lib/places-api';

interface PlacesAutocompleteProps {
  initialValue?: string | null;
  onSelect: (lat: number, lng: number, address: string) => void;
}

export function PlacesAutocomplete({ initialValue, onSelect }: PlacesAutocompleteProps) {
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');

  const [query, setQuery] = useState(initialValue ?? '');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!text.trim()) {
      setPredictions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(text);
      setPredictions(results);
      setIsSearching(false);
    }, 300);
  }, []);

  const handleSelect = async (prediction: PlacePrediction) => {
    setQuery(prediction.description);
    setPredictions([]);
    const details = await getPlaceDetails(prediction.placeId);
    if (details) {
      onSelect(details.lat, details.lng, details.address);
    }
  };

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
          style={{ flex: 1, color: text, fontSize: 15 }}
        />
        {query.length > 0 && (
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

      {predictions.length > 0 && (
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            overflow: 'hidden',
          }}
        >
          {predictions.map((prediction, index) => (
            <Pressable
              key={prediction.placeId}
              onPress={() => handleSelect(prediction)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 12,
                borderBottomWidth: index < predictions.length - 1 ? 1 : 0,
                borderBottomColor: border,
              }}
            >
              <MaterialIcons name="location-on" size={20} color={primary} />
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
