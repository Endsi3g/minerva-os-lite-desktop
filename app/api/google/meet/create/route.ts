import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';
import { createMeetConference } from '@/lib/google/google-meet-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getFreshAccessToken(supabase, user.id);
    const body = await req.json();
    const {
      calendarId = 'primary',
      summary = 'Réunion Minerva Meet',
      startTime,
      endTime
    } = body;

    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'Missing parameters: startTime and endTime are required' }, { status: 400 });
    }

    const meetSolution = await createMeetConference(token, calendarId, summary, startTime, endTime);
    return NextResponse.json(meetSolution);
  } catch (err: any) {
    console.error('[google/meet/create]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
