import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAccessToken } from '@/lib/google/google-auth-service';

function buildReplyMime(to: string, subject: string, body: string, inReplyTo?: string): string {
  const reSubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
  const utf8Subject = `=?utf-8?B?${Buffer.from(reSubject).toString('base64')}?=`;

  const parts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ];

  if (inReplyTo) {
    parts.push(`In-Reply-To: ${inReplyTo}`);
    parts.push(`References: ${inReplyTo}`);
  }

  parts.push('', Buffer.from(body).toString('base64'));

  const message = parts.join('\r\n');
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { threadId, to, subject, body, inReplyTo } = await req.json();
    if (!threadId || !to || !body) {
      return NextResponse.json({ error: 'threadId, to et body sont requis' }, { status: 400 });
    }

    // Resolve access token (both legacy and new flows)
    const tokenData = await resolveAccessToken(supabase, user.id);
    if (!tokenData) return NextResponse.json({ error: 'Gmail non connecté' }, { status: 400 });
    const { accessToken } = tokenData;

    const raw = buildReplyMime(to, subject || '', body, inReplyTo);

    const gmailRes = await fetch('https://gmail.googleapis.com/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw, threadId }),
    });

    if (!gmailRes.ok) {
      const err = await gmailRes.json();
      console.error('[inbox/reply] Gmail send error:', err);
      return NextResponse.json({ error: 'Erreur envoi Gmail' }, { status: gmailRes.status });
    }

    const sent = await gmailRes.json();
    return NextResponse.json({ success: true, messageId: sent.id });
  } catch (err) {
    console.error('[inbox/reply] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
