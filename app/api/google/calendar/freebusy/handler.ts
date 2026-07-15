import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';
import { getFreeBusy } from '@/lib/google/google-calendar-service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getFreshAccessToken(supabase, user.id);
    const { searchParams } = new URL(req.url);
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    const calendarsStr = searchParams.get('calendars') || 'primary';

    if (!timeMin || !timeMax) {
      return NextResponse.json({ error: 'Missing parameters: timeMin and timeMax are required' }, { status: 400 });
    }

    const calendarIds = calendarsStr.split(',').filter(Boolean);
    const availability = await getFreeBusy(token, timeMin, timeMax, calendarIds);

    return NextResponse.json(availability);
  } catch (err: any) {
    console.error('[google/calendar/freebusy]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
