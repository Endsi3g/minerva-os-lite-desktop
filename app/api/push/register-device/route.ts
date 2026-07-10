import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token, platform } = await req.json().catch(() => ({}));
  if (!token || (platform !== 'ios' && platform !== 'android')) {
    return NextResponse.json({ error: 'token and platform (ios|android) are required' }, { status: 400 });
  }

  const { error } = await supabase.from('device_push_tokens').upsert(
    {
      user_id: user.id,
      platform,
      token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
