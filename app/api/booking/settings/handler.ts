// GET  /api/booking/settings?username=<slug>  — public, returns booking page config
// GET  /api/booking/settings                   — auth, returns current user's settings
// POST /api/booking/settings                   — auth, upsert settings

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

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');

  if (username) {
    // Public lookup by username
    const { data, error } = await admin()
      .from('booking_settings')
      .select('user_id, username, title, description, duration_minutes, buffer_minutes, availability, timezone')
      .eq('username', username)
      .maybeSingle();

    if (error || !data) return NextResponse.json({ error: 'Page de réservation introuvable' }, { status: 404 });

    // Also fetch host profile
    const { data: profile } = await admin()
      .from('settings')
      .select('full_name, company_name, avatar_base64')
      .eq('user_id', data.user_id)
      .maybeSingle();

    return NextResponse.json({ ...data, host: profile });
  }

  // Authenticated: return own settings
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await admin()
    .from('booking_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json(data ?? null);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { username, title, description, duration_minutes, buffer_minutes, availability, timezone, google_calendar_id } = body;

  const { data, error } = await admin()
    .from('booking_settings')
    .upsert({
      user_id: user.id,
      username: username?.toLowerCase().replace(/[^a-z0-9_-]/g, '') || null,
      title: title || 'Réservez un appel',
      description: description || null,
      duration_minutes: duration_minutes || 30,
      buffer_minutes: buffer_minutes || 15,
      availability: availability || null,
      timezone: timezone || 'Europe/Paris',
      google_calendar_id: google_calendar_id || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
