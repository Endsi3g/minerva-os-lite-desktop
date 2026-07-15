import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Proxies a single Google Places photo so the API key never reaches the client.
// `name` must be one of the photo resource names already cached on the lead's
// google_place_data.photos (set by /api/leads/enrich-google) — this isn't a general-purpose
// Places photo proxy, only ever serves photos we already fetched for this specific lead.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const name = req.nextUrl.searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'name requis' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: settingsRow } = await supabase
    .from('settings')
    .select('google_places_api_key')
    .eq('user_id', user.id)
    .maybeSingle();
  const apiKey: string = settingsRow?.google_places_api_key || process.env.GOOGLE_PLACES_API_KEY || '';

  if (!apiKey) {
    return NextResponse.json({ error: 'Clé Google Places API non configurée — ajoutez-la dans Paramètres > Intégrations.' }, { status: 400 });
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('google_place_data')
    .eq('id', id)
    .maybeSingle();

  const cachedPhotos: string[] = lead?.google_place_data?.photos || [];
  if (!cachedPhotos.includes(name)) {
    return NextResponse.json({ error: 'Photo non référencée pour ce lead' }, { status: 403 });
  }

  const mediaRes = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&key=${apiKey}`
  );
  if (!mediaRes.ok || !mediaRes.body) {
    return NextResponse.json({ error: 'Échec de récupération de la photo' }, { status: 502 });
  }

  return new NextResponse(mediaRes.body, {
    headers: {
      'Content-Type': mediaRes.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
