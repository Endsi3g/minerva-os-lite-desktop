import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = new URL(req.url).searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'Missing ?email= parameter' }, { status: 400 });
    }

    let accessToken: string;
    try {
      accessToken = await getFreshAccessToken(supabase, user.id);
    } catch {
      return NextResponse.json({ connected: false, threads: [] });
    }

    const q = `from:${email} OR to:${email}`;
    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/threads');
    listUrl.searchParams.set('q', q);
    listUrl.searchParams.set('maxResults', '10');

    const listResp = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResp.ok) {
      const err = await listResp.json();
      return NextResponse.json(
        { connected: true, threads: [], error: err?.error?.message || 'Gmail API error' },
        { status: 200 }
      );
    }

    const listData = await listResp.json();
    const threadItems: any[] = listData.threads || [];

    const threads = await Promise.all(
      threadItems.map(async (t: { id: string }) => {
        try {
          const tResp = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=From`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!tResp.ok) return null;
          const tData = await tResp.json();
          const messages: any[] = tData.messages || [];
          if (!messages.length) return null;

          const firstMsg = messages[0];
          const lastMsg = messages[messages.length - 1];
          const headers: { name: string; value: string }[] = firstMsg.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

          const subject = getHeader('subject') || '(Sans objet)';
          const dateStr = getHeader('date');
          const date = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
          const snippet = (firstMsg.snippet || '').slice(0, 200);
          const unread = (lastMsg.labelIds || []).includes('UNREAD');

          return { id: t.id, subject, date, snippet, unread };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      connected: true,
      threads: threads.filter(Boolean),
    });
  } catch (err: any) {
    console.error('[google/gmail/lead-threads]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
