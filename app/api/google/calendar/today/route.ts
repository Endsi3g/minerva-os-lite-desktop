import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let accessToken: string;
    try {
      accessToken = await getFreshAccessToken(supabase, user.id);
    } catch {
      return NextResponse.json({ connected: false, events: [] });
    }

    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', timeMin);
    url.searchParams.set('timeMax', timeMax);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '20');

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const err = await resp.json();
      return NextResponse.json(
        { connected: true, events: [], error: err?.error?.message || 'Calendar API error' },
        { status: 200 }
      );
    }

    const data = await resp.json();
    const events = (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary || '(Sans titre)',
      start: item.start?.dateTime || item.start?.date || null,
      end: item.end?.dateTime || item.end?.date || null,
      hangoutLink: item.hangoutLink || null,
      location: item.location || null,
    }));

    return NextResponse.json({ connected: true, events });
  } catch (err: any) {
    console.error('[google/calendar/today]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
