import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAccessToken } from '@/lib/google/google-auth-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { threadId } = await req.json();
    if (!threadId) return NextResponse.json({ error: 'threadId requis' }, { status: 400 });

    const tokenData = await resolveAccessToken(supabase, user.id);
    if (!tokenData) return NextResponse.json({ error: 'Gmail non connecté' }, { status: 400 });
    const { accessToken } = tokenData;

    // Remove INBOX label — requires gmail.modify scope
    const res = await fetch(`https://gmail.googleapis.com/v1/users/me/threads/${threadId}/modify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
    });

    if (res.status === 403) {
      return NextResponse.json({ error: 'scope_missing', needsReauth: true }, { status: 403 });
    }
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err?.error?.message || 'Erreur Gmail' }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[inbox/archive]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
