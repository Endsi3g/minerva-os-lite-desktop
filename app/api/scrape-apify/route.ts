import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ApifyPlace {
  title?: string;
  categoryName?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
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
  source: string;
  latitude?: number;
  longitude?: number;
}

function buildSeoAudit(place: ApifyPlace): string {
  const issues: string[] = [];
  if (!place.website) issues.push('Aucun site web détecté');
  if ((place.totalScore ?? 5) < 3.5) issues.push(`Note très faible (${place.totalScore ?? 0}/5) — gestion de réputation urgente`);
  else if ((place.totalScore ?? 5) < 4.0) issues.push(`Note faible (${place.totalScore ?? 0}/5)`);
  if ((place.reviewsCount ?? 0) < 5) issues.push('Très peu d\'avis clients');
  else if ((place.reviewsCount ?? 0) < 15) issues.push('Peu d\'avis clients');
  return issues.length > 0 ? issues.join(' · ') : 'Profil local correct — proposer l\'automatisation Minerva';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both single niche and arrays
    const niches: string[] = Array.isArray(body.niches) && body.niches.length > 0
      ? body.niches : body.niche ? [body.niche] : ['commerce local'];
    const cities: string[] = Array.isArray(body.cities) && body.cities.length > 0
      ? body.cities : body.city ? [body.city] : ['Montréal'];
    const maxResults = Math.min(Math.max(Number(body.maxResults) || 50, 5), 500);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: settings } = await supabase.from('settings').select('apify_token').eq('user_id', user.id).maybeSingle();
    const apifyToken = (settings as any)?.apify_token;
    if (!apifyToken || apifyToken === 'native' || !apifyToken.startsWith('apify_api_')) {
      return NextResponse.json({ error: 'Clé API Apify manquante ou invalide. Configurez-la dans Paramètres → Intégrations.' }, { status: 400 });
    }

    // Build search terms: one per niche×city combination (up to 10)
    const searchTerms: string[] = cities.flatMap(city =>
      niches.map(niche => body.query || `${niche} ${city}`)
    ).slice(0, 10);

    const perSearch = Math.ceil(maxResults / searchTerms.length);

    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${apifyToken}&timeout=90&memory=1024`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerms,
          maxCrawledPlacesPerSearch: Math.max(perSearch, 10),
          language: 'fr',
          countryCode: 'ca',
          scrapeWebsite: false,
        }),
        signal: AbortSignal.timeout(95000),
      }
    );

    const rawText = await apifyRes.text();

    if (!apifyRes.ok) {
      return NextResponse.json({ error: `Apify API error ${apifyRes.status}: ${rawText.slice(0, 300)}` }, { status: 502 });
    }

    if (rawText.trimStart().startsWith('<')) {
      console.error('[scrape-apify] Apify returned HTML instead of JSON:', rawText.slice(0, 300));
      return NextResponse.json(
        { error: 'Apify a retourné une page HTML au lieu de JSON. La clé API est peut-être invalide ou expirée — vérifiez-la dans Paramètres → Intégrations.' },
        { status: 502 }
      );
    }

    let places: ApifyPlace[];
    try {
      places = JSON.parse(rawText);
    } catch {
      console.error('[scrape-apify] Apify JSON parse error. Body start:', rawText.slice(0, 300));
      return NextResponse.json(
        { error: 'Apify a retourné une réponse non-JSON inattendue. Vérifiez votre clé API dans Paramètres → Intégrations.' },
        { status: 502 }
      );
    }

    // Deduplicate by name+city
    const seen = new Set<string>();
    const leads: ScrapedLead[] = places
      .filter(p => p.title)
      .filter(p => {
        const key = `${(p.title ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')}|${(p.city ?? '').toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, maxResults)
      .map((p, i) => ({
        id: `apify-${i}-${Date.now()}`,
        businessName: p.title ?? 'Inconnu',
        niche: p.categoryName ?? (niches[0] ?? 'Commerce local'),
        city: p.city ?? cities[0],
        phone: p.phone ?? '',
        email: p.email ?? '',
        website: p.website ?? '',
        rating: p.totalScore ?? 0,
        reviewsCount: p.reviewsCount ?? 0,
        mapsUrl: p.url ?? '',
        seoAudit: buildSeoAudit(p),
        source: 'apify',
        latitude: p.location?.lat,
        longitude: p.location?.lng,
      }));

    return NextResponse.json({ leads, source: 'apify', total: leads.length });
  } catch (err: any) {
    console.error('[scrape-apify]', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}
