const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!;

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  lat: number;
  lng: number;
  address: string;
}

export async function searchPlaces(
  query: string,
  location?: { lat: number; lng: number },
): Promise<PlacePrediction[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    input: query,
    key: API_KEY,
  });

  if (location) {
    params.set('location', `${location.lat},${location.lng}`);
    params.set('radius', '50000');
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
  );
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return [];
  }

  return (data.predictions ?? []).map((p: {
    place_id: string;
    description: string;
    structured_formatting: { main_text: string; secondary_text: string };
  }) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting.main_text,
    secondaryText: p.structured_formatting.secondary_text,
  }));
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'geometry,formatted_address',
    key: API_KEY,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
  );
  const data = await response.json();

  if (data.status !== 'OK' || !data.result) {
    return null;
  }

  return {
    lat: data.result.geometry.location.lat,
    lng: data.result.geometry.location.lng,
    address: data.result.formatted_address,
  };
}
