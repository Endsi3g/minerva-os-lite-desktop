// POST /api/agenda/book
// Server-side side-effects for an appointment booked from the Agenda:
//   - optional Google Calendar event (if the user connected Google)
//   - optional Todoist task (if a Todoist token is saved in settings)
// The in-app task + team notifications are handled separately by the client.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCalendarEvent } from '@/lib/google/google-calendar-service';

async function getGoogleAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: account } = await supabase
    .from('google_accounts')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (!account) return null;
  const expiresAt = new Date(account.token_expires_at).getTime();
  if (Date.now() < expiresAt - 60000) return account.access_token;
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: account.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const tokens = await r.json();
    if (!tokens.access_token) return null;
    await supabase.from('google_accounts').update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    }).eq('user_id', userId);
    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    title, description, startISO, endISO,
    addToGoogle, addToTodoist, attendees,
  } = await request.json();

  if (!title || !startISO || !endISO) {
    return NextResponse.json({ error: 'title, startISO and endISO are required' }, { status: 400 });
  }

  const result: { google: boolean; todoist: boolean; meetLink?: string } = { google: false, todoist: false };

  // ── Google Calendar ──
  if (addToGoogle) {
    try {
      const token = await getGoogleAccessToken(supabase, user.id);
      if (token) {
        const event = await createCalendarEvent(token, 'primary', {
          summary: title,
          description: description || '',
          startTime: startISO,
          endTime: endISO,
          attendees: Array.isArray(attendees) ? attendees : [],
        });
        result.google = true;
        if (event?.hangoutLink) result.meetLink = event.hangoutLink;
      }
    } catch (e) {
      console.error('[agenda/book] google calendar', e);
    }
  }

  // ── Todoist ──
  if (addToTodoist) {
    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('todoist_token, todoist_project_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (settings?.todoist_token) {
        const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.todoist_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: title,
            description: description || '',
            due_datetime: startISO,
            ...(settings.todoist_project_id ? { project_id: settings.todoist_project_id } : {}),
          }),
        });
        result.todoist = res.ok;
      }
    } catch (e) {
      console.error('[agenda/book] todoist', e);
    }
  }

  return NextResponse.json({ success: true, ...result });
}
