import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = new URL(req.url).searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'Missing ?email= parameter' }, { status: 400 });
    }

    let accessToken: string;
    try {
      accessToken = await getFreshAccessToken(supabase, user.id);
    } catch {
      return NextResponse.json({ connected: false, events: [] });
    }

    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('q', email);
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

    // Filter to only events where the contact email is actually an attendee
    const events = (data.items || [])
      .filter((item: any) => {
        const attendees: { email: string }[] = item.attendees || [];
        return attendees.some(
          (a) => a.email?.toLowerCase() === email.toLowerCase()
        );
      })
      .map((item: any) => ({
        id: item.id,
        summary: item.summary || '(Sans titre)',
        start: item.start?.dateTime || item.start?.date || null,
        end: item.end?.dateTime || item.end?.date || null,
        status: item.status || 'confirmed',
        hangoutLink: item.hangoutLink || null,
      }));

    return NextResponse.json({ connected: true, events });
  } catch (err: any) {
    console.error('[google/calendar/lead-events]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
