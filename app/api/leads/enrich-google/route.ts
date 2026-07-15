import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PlaceResult {
  id?: string;
  displayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  editorialSummary?: { text: string };
  reviews?: Array<{
    text?: { text: string };
    rating?: number;
    relativePublishTimeDescription?: string;
    authorAttribution?: { displayName?: string; photoUri?: string };
  }>;
  generativeSummary?: {
    overview?: { text: string };
  };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  formattedAddress?: string;
  photos?: Array<{ name?: string }>;
  allowsDogs?: boolean;
  accessibilityOptions?: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleSeating?: boolean;
  };
  evChargeOptions?: {
    connectorCount?: number;
    connectorAggregation?: Array<{
      connectorType?: string;
      maxChargeRateKw?: number;
      count?: number;
    }>;
  };
}

async function searchPlace(businessName: string, city: string, apiKey: string): Promise<PlaceResult | null> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.rating',
        'places.userRatingCount',
        'places.editorialSummary',
        'places.reviews',
        'places.regularOpeningHours',
        'places.generativeSummary',
        'places.websiteUri',
        'places.nationalPhoneNumber',
        'places.formattedAddress',
        'places.photos',
        'places.allowsDogs',
        'places.accessibilityOptions',
        'places.evChargeOptions',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: `${businessName} ${city}`,
      languageCode: 'fr',
      maxResultCount: 1,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.places?.[0] ?? null;
}

function extractInsights(place: PlaceResult): string[] {
  const insights: string[] = [];

  // From generative summary (Bon à savoir)
  if (place.generativeSummary?.overview?.text) {
    insights.push(place.generativeSummary.overview.text);
  }

  // From editorial summary
  if (place.editorialSummary?.text) {
    insights.push(place.editorialSummary.text);
  }

  // From top reviews — extract unique details
  (place.reviews || []).slice(0, 3).forEach(r => {
    const text = r.text?.text;
    if (text && text.length > 30) {
      insights.push(text.slice(0, 200));
    }
  });

  return insights;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leadId, force = false } = await req.json();
  if (!leadId) return NextResponse.json({ error: 'leadId requis' }, { status: 400 });

  const { data: lead } = await supabase
    .from('leads')
    .select('id, business_name, city, google_place_id, google_place_data, google_enriched_at, rating, reviews_count, website, phone, address')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });

  // If already enriched in the last 7 days and not force-refreshing, return cached
  if (!force && lead.google_enriched_at) {
    const age = Date.now() - new Date(lead.google_enriched_at).getTime();
    if (age < 7 * 24 * 60 * 60 * 1000 && lead.google_place_data) {
      return NextResponse.json({ ok: true, cached: true, data: lead.google_place_data });
    }
  }

  // Clé par utilisateur (Paramètres > Intégrations) en priorité, sinon la clé
  // globale du déploiement — même pattern que here_api_key/yelp_api_key/firecrawl_api_key.
  const { data: settingsRow } = await supabase
    .from('settings')
    .select('google_places_api_key')
    .eq('user_id', user.id)
    .maybeSingle();
  const apiKey: string = settingsRow?.google_places_api_key || process.env.GOOGLE_PLACES_API_KEY || '';

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'Clé Google Places API non configurée — ajoutez-la dans Paramètres > Intégrations.',
    }, { status: 400 });
  }

  const place = await searchPlace(lead.business_name, lead.city || '', apiKey);
  if (!place) {
    return NextResponse.json({ ok: false, error: 'Lieu introuvable sur Google Places' }, { status: 404 });
  }

  const placeData = {
    place_id: place.id,
    name: place.displayName?.text,
    rating: place.rating,
    review_count: place.userRatingCount,
    editorial_summary: place.editorialSummary?.text ?? null,
    generative_summary: place.generativeSummary?.overview?.text ?? null,
    reviews: (place.reviews || []).slice(0, 5).map(r => ({
      text: r.text?.text ?? '',
      rating: r.rating ?? 0,
      time: r.relativePublishTimeDescription ?? '',
      authorName: r.authorAttribution?.displayName ?? undefined,
      // Reviewer profile photo — a public googleusercontent.com URL, safe to use directly
      // (unlike place photos below, it isn't gated behind our GOOGLE_PLACES_API_KEY).
      authorPhotoUrl: r.authorAttribution?.photoUri ?? undefined,
    })),
    // Photo resource names only (e.g. "places/XXX/photos/YYY"), never a direct media URL —
    // the actual image bytes are fetched server-side via /api/leads/[id]/place-photo so the
    // API key never reaches the client.
    photos: (place.photos || []).slice(0, 6).map(p => p.name).filter(Boolean) as string[],
    opening_hours: place.regularOpeningHours ?? null,
    website: place.websiteUri ?? null,
    phone: place.nationalPhoneNumber ?? null,
    insights: extractInsights(place),
    allows_dogs: place.allowsDogs ?? null,
    accessibility_options: place.accessibilityOptions ?? null,
    ev_charging_options: place.evChargeOptions ?? null,
  };

  const updatePayload: any = {
    google_place_id: place.id,
    google_place_data: placeData,
    google_enriched_at: new Date().toISOString(),
  };

  if (!lead.rating && place.rating) updatePayload.rating = place.rating;
  if (!lead.reviews_count && place.userRatingCount) updatePayload.reviews_count = place.userRatingCount;
  if (!lead.website && place.websiteUri) updatePayload.website = place.websiteUri;
  if (!lead.phone && place.nationalPhoneNumber) updatePayload.phone = place.nationalPhoneNumber;
  updatePayload.maps_url = `https://www.google.com/maps/place/?q=place_id:${place.id}`;
  if (place.formattedAddress) {
    updatePayload.address = place.formattedAddress;
  }

  await supabase.from('leads').update(updatePayload).eq('id', leadId);

  return NextResponse.json({ ok: true, cached: false, data: placeData });
}
