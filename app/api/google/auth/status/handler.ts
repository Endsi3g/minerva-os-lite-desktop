import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthStatus } from '@/lib/google/google-auth-service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ connected: false, email: null });
    }

    const status = await getAuthStatus(supabase, user.id);
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('[google/auth/status]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
