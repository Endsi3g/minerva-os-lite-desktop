import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ApifyPlace {
  title?: string;
  categoryName?: string;
  address?: string;
  city?: string;
  phone?: string;
  website?: string;
  totalScore?: number;
  reviewsCount?: number;
  url?: string;
  location?: { lat?: number; lng?: number };
}

interface ScrapedLead {
  id: string;
  businessName: string;
  niche: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  rating: number;
  reviewsCount: number;
  mapsUrl: string;
  seoAudit: string;
  latitude?: number;
  longitude?: number;
}

function buildSeoAudit(place: ApifyPlace): string {
  const issues: string[] = [];
  if (!place.website) issues.push('Aucun site web détecté');
  if ((place.totalScore ?? 5) < 4.0) issues.push(`Note faible (${place.totalScore ?? 0}/5)`);
  if ((place.reviewsCount ?? 0) < 10) issues.push('Peu d\'avis clients');
  return issues.length > 0 ? issues.join(' · ') : 'Profil local correct';
}

export async function POST(req: NextRequest) {
  try {
    const { niche, city, query } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: settings } = await supabase
      .from('settings')
      .select('apify_token')
      .eq('user_id', user.id)
      .maybeSingle();

    const apifyToken = settings?.apify_token;
    if (!apifyToken || apifyToken === 'native' || !apifyToken.startsWith('apify_api_')) {
      return NextResponse.json({ error: 'Clé API Apify manquante ou invalide. Configurez-la dans Paramètres → Intégrations.' }, { status: 400 });
    }

    const searchTerm = query || `${niche} ${city}`;

    // Use run-sync endpoint — Apify starts the actor and streams dataset items back when done
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${apifyToken}&timeout=60&memory=512`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerms: [searchTerm],
          maxCrawledPlacesPerSearch: 25,
          language: 'fr',
          countryCode: 'ca',
        }),
        signal: AbortSignal.timeout(65_000),
      }
    );

    if (!apifyRes.ok) {
      const errText = await apifyRes.text();
      return NextResponse.json({ error: `Apify API error ${apifyRes.status}: ${errText}` }, { status: 502 });
    }

    const places: ApifyPlace[] = await apifyRes.json();

    const leads: ScrapedLead[] = places
      .filter(p => p.title)
      .map((p, i) => ({
        id: `apify-${i}-${Date.now()}`,
        businessName: p.title ?? 'Inconnu',
        niche: p.categoryName ?? (niche || 'Commerce local'),
        city: p.city ?? city ?? '',
        phone: p.phone ?? '',
        email: '',
        website: p.website ?? '',
        rating: p.totalScore ?? 0,
        reviewsCount: p.reviewsCount ?? 0,
        mapsUrl: p.url ?? '',
        seoAudit: buildSeoAudit(p),
        latitude: p.location?.lat,
        longitude: p.location?.lng,
      }));

    return NextResponse.json({ leads, source: 'apify' });
  } catch (err: any) {
    console.error('[scrape-apify]', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}
