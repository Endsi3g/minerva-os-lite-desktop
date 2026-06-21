// GET /api/booking/slots?username=<slug>&date=YYYY-MM-DD
// Returns available time slots for a given day, using Google Calendar freebusy.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const DEFAULT_AVAILABILITY = {
  monday:    { enabled: true, start: '09:00', end: '17:00' },
  tuesday:   { enabled: true, start: '09:00', end: '17:00' },
  wednesday: { enabled: true, start: '09:00', end: '17:00' },
  thursday:  { enabled: true, start: '09:00', end: '17:00' },
  friday:    { enabled: true, start: '09:00', end: '17:00' },
  saturday:  { enabled: false, start: '09:00', end: '12:00' },
  sunday:    { enabled: false, start: '09:00', end: '12:00' },
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

async function getFreeBusySlots(
  accessToken: string,
  calendarId: string,
  date: string,
  timezone: string
): Promise<{ start: string; end: string }[]> {
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      timeZone: timezone,
      items: [{ id: calendarId }],
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data.calendars?.[calendarId]?.busy ?? []) as { start: string; end: string }[];
}

function generateSlots(
  date: string,
  dayConfig: { start: string; end: string },
  durationMin: number,
  bufferMin: number,
  busyPeriods: { start: string; end: string }[]
): string[] {
  const slots: string[] = [];
  const [startH, startM] = dayConfig.start.split(':').map(Number);
  const [endH, endM] = dayConfig.end.split(':').map(Number);

  let current = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (current + durationMin <= endMinutes) {
    const slotStart = new Date(`${date}T${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}:00`);
    const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);

    const isBusy = busyPeriods.some(busy => {
      const busyStart = new Date(busy.start).getTime();
      const busyEnd = new Date(busy.end).getTime();
      return slotStart.getTime() < busyEnd && slotEnd.getTime() > busyStart;
    });

    if (!isBusy && slotStart > new Date()) {
      slots.push(slotStart.toISOString());
    }

    current += durationMin + bufferMin;
  }

  return slots;
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');
  const date = req.nextUrl.searchParams.get('date');

  if (!username || !date) {
    return NextResponse.json({ error: 'username and date required' }, { status: 400 });
  }

  const db = admin();

  const { data: settings } = await db
    .from('booking_settings')
    .select('user_id, duration_minutes, buffer_minutes, availability, timezone, google_calendar_id')
    .eq('username', username)
    .maybeSingle();

  if (!settings) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const dayName = DAY_NAMES[new Date(date + 'T12:00:00').getDay()];
  const availability = (settings.availability as typeof DEFAULT_AVAILABILITY) || DEFAULT_AVAILABILITY;
  const dayConfig = availability[dayName as keyof typeof DEFAULT_AVAILABILITY];

  if (!dayConfig?.enabled) {
    return NextResponse.json({ slots: [], reason: 'day_off' });
  }

  let busyPeriods: { start: string; end: string }[] = [];

  if (settings.google_calendar_id) {
    const { data: userSettings } = await db
      .from('settings')
      .select('google_access_token, google_refresh_token, google_token_expires_at')
      .eq('user_id', settings.user_id)
      .maybeSingle();

    let accessToken = userSettings?.google_access_token;
    const expiresAt = userSettings?.google_token_expires_at ? new Date(userSettings.google_token_expires_at) : null;

    if (accessToken && expiresAt && expiresAt < new Date() && userSettings?.google_refresh_token) {
      try {
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
          const tokenData = await tokenRes.json();
          accessToken = tokenData.access_token;
          await db.from('settings').update({
            google_access_token: accessToken,
            google_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          }).eq('user_id', settings.user_id);
        }
      } catch { /* continue without freebusy */ }
    }

    if (accessToken) {
      busyPeriods = await getFreeBusySlots(accessToken, settings.google_calendar_id, date, settings.timezone);
    }
  }

  const slots = generateSlots(
    date,
    dayConfig,
    settings.duration_minutes,
    settings.buffer_minutes,
    busyPeriods
  );

  return NextResponse.json({ slots, durationMinutes: settings.duration_minutes });
}
