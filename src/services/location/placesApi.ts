const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';
const GEOCODING_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode';

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  types: string[];
}

export interface GeocodingResult {
  formattedAddress: string;
  placeId: string;
  addressComponents: {
    longName: string;
    shortName: string;
    types: string[];
  }[];
}

export async function searchPlaces(
  query: string,
  location?: { lat: number; lng: number }
): Promise<PlacePrediction[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    input: query,
    key: API_KEY,
    types: 'establishment|geocode',
  });

  if (location) {
    params.append('location', `${location.lat},${location.lng}`);
    params.append('radius', '50000');
  }

  const response = await fetch(`${PLACES_BASE_URL}/autocomplete/json?${params}`);
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${data.status}`);
  }

  return (data.predictions ?? []).map((p: any) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? '',
    types: p.types ?? [],
  }));
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const params = new URLSearchParams({
    place_id: placeId,
    key: API_KEY,
    fields: 'place_id,name,formatted_address,geometry,types',
  });

  const response = await fetch(`${PLACES_BASE_URL}/details/json?${params}`);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Place Details API error: ${data.status}`);
  }

  const result = data.result;
  return {
    placeId: result.place_id,
    name: result.name,
    formattedAddress: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    types: result.types ?? [],
  };
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: API_KEY,
  });

  const response = await fetch(`${GEOCODING_BASE_URL}/json?${params}`);
  const data = await response.json();

  if (data.status !== 'OK' || !data.results?.length) {
    return null;
  }

  const result = data.results[0];
  return {
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
    addressComponents: result.address_components.map((c: any) => ({
      longName: c.long_name,
      shortName: c.short_name,
      types: c.types,
    })),
  };
}
