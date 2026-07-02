import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

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
  }>;
  generativeSummary?: {
    overview?: { text: string };
  };
  websiteUri?: string;
  nationalPhoneNumber?: string;
}

async function searchPlace(businessName: string, city: string): Promise<PlaceResult | null> {
  if (!PLACES_API_KEY) return null;

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
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
    .select('id, business_name, city, google_place_id, google_place_data, google_enriched_at')
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

  if (!PLACES_API_KEY) {
    return NextResponse.json({
      ok: false,
      error: 'GOOGLE_PLACES_API_KEY non configurée dans les variables d\'environnement',
    }, { status: 400 });
  }

  const place = await searchPlace(lead.business_name, lead.city || '');
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
    reviews: (place.reviews || []).slice(0, 3).map(r => ({
      text: r.text?.text ?? '',
      rating: r.rating ?? 0,
      time: r.relativePublishTimeDescription ?? '',
    })),
    opening_hours: place.regularOpeningHours ?? null,
    website: place.websiteUri ?? null,
    phone: place.nationalPhoneNumber ?? null,
    insights: extractInsights(place),
  };

  await supabase.from('leads').update({
    google_place_id: place.id,
    google_place_data: placeData,
    google_enriched_at: new Date().toISOString(),
  }).eq('id', leadId);

  return NextResponse.json({ ok: true, cached: false, data: placeData });
}
