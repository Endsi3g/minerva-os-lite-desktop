import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';
import { listGmailThreads } from '@/lib/google/google-gmail-service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getFreshAccessToken(supabase, user.id);
    const threads = await listGmailThreads(token);

    return NextResponse.json(threads);
  } catch (err: any) {
    console.error('[google/gmail/threads]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
