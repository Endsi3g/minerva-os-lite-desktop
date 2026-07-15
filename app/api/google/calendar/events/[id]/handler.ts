import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';
import { patchCalendarEvent, deleteCalendarEvent } from '@/lib/google/google-calendar-service';

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getFreshAccessToken(supabase, user.id);
    const body = await req.json();
    const { calendarId = 'primary', ...updates } = body;

    const event = await patchCalendarEvent(token, calendarId, params.id, updates);

    // Sync updates to calendar_links table
    await supabase
      .from('calendar_links')
      .update({
        title: event.summary,
        start_time: event.start?.dateTime,
        end_time: event.end?.dateTime,
        meet_link: event.hangoutLink || null,
        updated_at: new Date().toISOString()
      })
      .eq('google_event_id', params.id)
      .eq('user_id', user.id);

    return NextResponse.json(event);
  } catch (err: any) {
    console.error('[google/calendar/events/patch]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getFreshAccessToken(supabase, user.id);
    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get('calendarId') || 'primary';

    await deleteCalendarEvent(token, calendarId, params.id);

    // Remove from database (meet_sessions cascades or deletes as well)
    await supabase
      .from('calendar_links')
      .delete()
      .eq('google_event_id', params.id)
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[google/calendar/events/delete]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
