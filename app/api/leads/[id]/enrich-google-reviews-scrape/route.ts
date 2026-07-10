import { NextRequest, NextResponse } from 'next/server';
import Firecrawl from '@mendable/firecrawl-js';
import { createClient } from '@/lib/supabase/server';
import type { GooglePlaceData, GooglePlaceReview } from '@/lib/mock-data';

// Best-effort supplement to /api/leads/enrich-google's official Places API (New) call, which
// is capped at 5 reviews by Google. Scrapes the lead's actual Maps place page via Firecrawl —
// manually triggered only (never automatic) because scraping Maps content sits in a ToS grey
// area and the page structure can change without notice, unlike the official API above.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: lead } = await supabase
    .from('leads')
    .select('id, maps_url, google_place_data')
    .eq('id', id)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });
  if (!lead.maps_url) {
    return NextResponse.json({ ok: false, error: 'Ce lead n\'a pas de lien Google Maps.' }, { status: 400 });
  }

  const { data: settingsRow } = await supabase
    .from('settings')
    .select('firecrawl_api_key')
    .eq('user_id', user.id)
    .maybeSingle();
  const firecrawlApiKey: string = settingsRow?.firecrawl_api_key || process.env.FIRECRAWL_API_KEY || '';
  if (!firecrawlApiKey) {
    return NextResponse.json({ ok: false, error: 'Firecrawl non configuré (FIRECRAWL_API_KEY).' }, { status: 400 });
  }

  let scraped: Array<{ author?: string; rating?: number; text?: string; relative_time?: string }> = [];
  try {
    const fc = new Firecrawl({ apiKey: firecrawlApiKey });
    const result = await fc.scrape(lead.maps_url, {
      formats: [{
        type: 'json' as const,
        prompt: 'Extract ALL customer reviews visible on this Google Maps business page. For each review, extract: author (reviewer display name), rating (1-5 stars), text (the full review text), and relative_time (e.g. "2 months ago").',
        schema: {
          type: 'object',
          properties: {
            reviews: {
              type: 'array',
              description: 'All customer reviews on the page',
              items: {
                type: 'object',
                properties: {
                  author: { type: 'string' },
                  rating: { type: 'number' },
                  text: { type: 'string' },
                  relative_time: { type: 'string' },
                },
              },
            },
          },
          required: ['reviews'],
        },
      }],
      timeout: 25000,
    });
    scraped = (result as any).json?.reviews ?? [];
  } catch (err) {
    console.error('[enrich-google-reviews-scrape]', err);
    return NextResponse.json({ ok: false, error: 'Échec du scraping de la page Google Maps.' }, { status: 502 });
  }

  const existing: GooglePlaceData = (lead.google_place_data as GooglePlaceData) || {};
  const existingReviews = existing.reviews || [];
  const seen = new Set(existingReviews.map((r) => `${r.authorName || ''}::${(r.text || '').slice(0, 40)}`));

  const newReviews: GooglePlaceReview[] = scraped
    .filter((r) => r.text && !seen.has(`${r.author || ''}::${(r.text || '').slice(0, 40)}`))
    .map((r) => ({
      text: r.text || '',
      rating: r.rating ?? 5,
      time: r.relative_time || '',
      authorName: r.author || undefined,
    }));

  const mergedData: GooglePlaceData = {
    ...existing,
    reviews: [...existingReviews, ...newReviews],
  };

  await supabase
    .from('leads')
    .update({ google_place_data: mergedData })
    .eq('id', id);

  return NextResponse.json({ ok: true, added: newReviews.length, data: mergedData });
}
