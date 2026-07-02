import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';
import { syncGmailThreads } from '@/lib/google/google-gmail-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getFreshAccessToken(supabase, user.id);
    const body = await req.json().catch(() => ({}));
    let workspaceId = body.workspaceId;

    if (!workspaceId) {
      // Fallback: get first workspace owned by the user
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);
      workspaceId = workspaces?.[0]?.id;
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found to sync' }, { status: 400 });
    }

    const syncedCount = await syncGmailThreads(supabase, user.id, token, workspaceId);
    return NextResponse.json({ success: true, syncedCount });
  } catch (err: any) {
    console.error('[google/gmail/sync]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
