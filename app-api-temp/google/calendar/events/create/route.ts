import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';
import { createCalendarEvent } from '@/lib/google/google-calendar-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getFreshAccessToken(supabase, user.id);
    
    // Find matching google_account ID
    const { data: account } = await supabase
      .from('google_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: 'Google account not connected' }, { status: 400 });
    }

    const body = await req.json();
    const {
      calendarId = 'primary',
      summary,
      description,
      startTime,
      endTime,
      attendees,
      enableMeet,
      leadId
    } = body;

    if (!summary || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing parameters: summary, startTime, and endTime are required' }, { status: 400 });
    }

    const event = await createCalendarEvent(token, calendarId, {
      summary,
      description,
      startTime,
      endTime,
      attendees,
      enableMeet
    });

    let newLinkId = null;
    if (leadId) {
      const { data: newLink, error: linkError } = await supabase
        .from('calendar_links')
        .insert({
          account_id: account.id,
          user_id: user.id,
          lead_id: leadId,
          google_event_id: event.id,
          title: event.summary,
          start_time: event.start?.dateTime || startTime,
          end_time: event.end?.dateTime || endTime,
          meet_link: event.hangoutLink || null
        })
        .select('id')
        .single();

      if (linkError) {
        console.error('Error creating calendar link entry:', linkError);
      } else if (newLink) {
        newLinkId = newLink.id;

        // If conference meet is set, save in meet_sessions
        if (event.hangoutLink) {
          const parts = event.hangoutLink.split('/');
          const meetCode = parts[parts.length - 1] || '';
          
          await supabase
            .from('meet_sessions')
            .insert({
              user_id: user.id,
              calendar_link_id: newLink.id,
              google_meet_code: meetCode,
              status: 'scheduled',
              start_time: event.start?.dateTime || startTime,
              end_time: event.end?.dateTime || endTime
            });
        }
      }
    }

    return NextResponse.json({ event, calendarLinkId: newLinkId });
  } catch (err: any) {
    console.error('[google/calendar/events/create]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
