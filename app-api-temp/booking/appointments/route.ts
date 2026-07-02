// POST /api/booking/appointments — book an appointment (public endpoint)
// GET  /api/booking/appointments — list own appointments (auth)

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await admin()
    .from('booking_appointments')
    .select('*')
    .eq('host_user_id', user.id)
    .order('start_at', { ascending: true });

  return NextResponse.json({ appointments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { username, guestName, guestEmail, guestNotes, startAt } = await req.json();

  if (!username || !guestName || !guestEmail || !startAt) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
  }

  const db = admin();

  // Look up booking settings by username
  const { data: settings } = await db
    .from('booking_settings')
    .select('user_id, duration_minutes, title, timezone, google_calendar_id')
    .eq('username', username)
    .maybeSingle();

  if (!settings) return NextResponse.json({ error: 'Page de réservation introuvable' }, { status: 404 });

  const start = new Date(startAt);
  const end = new Date(start.getTime() + settings.duration_minutes * 60000);

  // Insert appointment
  const { data: appt, error } = await db
    .from('booking_appointments')
    .insert({
      host_user_id: settings.user_id,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_notes: guestNotes || null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: 'confirmed',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Try to create Google Calendar event
  if (settings.google_calendar_id) {
    try {
      const { data: userSettings } = await db
        .from('settings')
        .select('google_access_token, google_refresh_token, google_token_expires_at, full_name')
        .eq('user_id', settings.user_id)
        .maybeSingle();

      let accessToken = userSettings?.google_access_token;
      const expiresAt = userSettings?.google_token_expires_at ? new Date(userSettings.google_token_expires_at) : null;

      if (expiresAt && expiresAt < new Date() && userSettings?.google_refresh_token) {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: userSettings.google_refresh_token,
            grant_type: 'refresh_token',
          }),
        });
        if (tokenRes.ok) {
          const t = await tokenRes.json();
          accessToken = t.access_token;
          await db.from('settings').update({
            google_access_token: accessToken,
            google_token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
          }).eq('user_id', settings.user_id);
        }
      }

      if (accessToken) {
        const eventRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(settings.google_calendar_id)}/events`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary: `${settings.title} — ${guestName}`,
              description: guestNotes || '',
              start: { dateTime: start.toISOString(), timeZone: settings.timezone },
              end: { dateTime: end.toISOString(), timeZone: settings.timezone },
              attendees: [{ email: guestEmail, displayName: guestName }],
              reminders: { useDefault: true },
            }),
          }
        );

        if (eventRes.ok) {
          const event = await eventRes.json();
          await db.from('booking_appointments').update({ google_event_id: event.id }).eq('id', appt.id);
        }
      }
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ appointment: appt });
}
