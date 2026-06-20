export interface PlaceResult {
  id: string;
  businessName: string;
  formattedAddress: string;
  website?: string;
  rating?: number;
  reviewsCount?: number;
  latitude: number;
  longitude: number;
  niche?: string;
  phone?: string;
}

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  return key;
}

export async function searchGooglePlaces(
  query: string,
  locationBias?: { latitude: number; longitude: number }
): Promise<PlaceResult[]> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.includes('placeholder')) {
    throw new Error('Google Places API key is not configured');
  }

  const url = 'https://places.googleapis.com/v1/places:searchText';
  const body: any = { textQuery: query };

  if (locationBias) {
    body.locationBias = {
      circle: {
        center: {
          latitude: locationBias.latitude,
          longitude: locationBias.longitude
        },
        radius: 10000.0 // 10km radius
      }
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      // Request exact field masks to keep latency and costs optimal
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.rating,places.userRatingCount,places.location,places.primaryType,places.nationalPhoneNumber'
    },
    body: JSON.stringify(body)
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(`Google Places search failed: ${JSON.stringify(resData)}`);
  }

  const places = resData.places || [];
  return places.map((p: any) => ({
    id: p.id,
    businessName: p.displayName?.text || '',
    formattedAddress: p.formattedAddress || '',
    website: p.websiteUri || undefined,
    rating: p.rating || undefined,
    reviewsCount: p.userRatingCount || undefined,
    latitude: p.location?.latitude || 0,
    longitude: p.location?.longitude || 0,
    niche: p.primaryType || undefined,
    phone: p.nationalPhoneNumber || undefined
  }));
}

export async function getGooglePlaceDetails(placeId: string): Promise<PlaceResult> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.includes('placeholder')) {
    throw new Error('Google Places API key is not configured');
  }

  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,websiteUri,rating,userRatingCount,location,primaryType,nationalPhoneNumber'
    }
  });

  const p = await response.json();
  if (!response.ok) {
    throw new Error(`Google Places details fetch failed: ${JSON.stringify(p)}`);
  }

  return {
    id: p.id,
    businessName: p.displayName?.text || '',
    formattedAddress: p.formattedAddress || '',
    website: p.websiteUri || undefined,
    rating: p.rating || undefined,
    reviewsCount: p.userRatingCount || undefined,
    latitude: p.location?.latitude || 0,
    longitude: p.location?.longitude || 0,
    niche: p.primaryType || undefined,
    phone: p.nationalPhoneNumber || undefined
  };
}
