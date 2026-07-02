import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGooglePlaceDetails } from '@/lib/google/google-places-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { placeId } = await params;
    if (!placeId) {
      return NextResponse.json({ error: 'Missing placeId parameter' }, { status: 400 });
    }

    const placeDetails = await getGooglePlaceDetails(placeId);
    return NextResponse.json(placeDetails);
  } catch (err: any) {
    console.error(`[google/places/details/${req.url}]`, err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
