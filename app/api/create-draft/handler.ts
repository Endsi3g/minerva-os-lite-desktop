import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAccessToken } from '@/lib/google/google-auth-service';

function makeMimeMessage(to: string, subject: string, body: string) {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    ...(to ? [`To: ${to}`] : []),
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body).toString('base64'),
  ];
  const message = messageParts.join('\r\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { to, subject = 'Prospection', body, leadId, workspaceId: bodyWorkspaceId } = await req.json();
    if (!body) return NextResponse.json({ error: 'body requis' }, { status: 400 });

    let workspaceId = bodyWorkspaceId;
    if (leadId && !workspaceId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('workspace_id')
        .eq('id', leadId)
        .maybeSingle();
      if (lead) {
        workspaceId = lead.workspace_id;
      }
    }

    const tokenData = await resolveAccessToken(supabase, user.id);

    if (!tokenData) {
      // Fallback: store as a document draft only
      if (leadId && workspaceId) {
        const { error: dbErr } = await supabase.from('drafts').insert({
          user_id: user.id,
          lead_id: leadId,
          workspace_id: workspaceId,
          subject,
          content: body,
          channel: 'Email',
          source: 'user',
          created_at: new Date().toISOString(),
        });
        if (dbErr) throw dbErr;
      }
      return NextResponse.json({ ok: true, simulated: true, draftId: null, message: 'Brouillon sauvegardé localement (Google non connecté).' });
    }

    const { accessToken: token } = tokenData;
    const rawMime = makeMimeMessage(to || '', subject, body);

    // Create Gmail draft (does NOT send)
    const gmailRes = await fetch('https://gmail.googleapis.com/v1/users/me/drafts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { raw: rawMime } }),
    });

    if (!gmailRes.ok) {
      const err = await gmailRes.json();
      return NextResponse.json({ error: err.error?.message || 'Erreur Gmail' }, { status: 500 });
    }

    const draft = await gmailRes.json();

    // Also persist draft to Supabase DB so it is visible in Inbox -> Brouillons
    if (leadId && workspaceId) {
      const { error: dbErr } = await supabase.from('drafts').insert({
        user_id: user.id,
        lead_id: leadId,
        workspace_id: workspaceId,
        subject,
        content: body,
        channel: 'Email',
        source: 'user',
        created_at: new Date().toISOString(),
      });
      if (dbErr) {
        console.warn('Draft persisted to Gmail but failed to save to Supabase:', dbErr);
      }
    }

    return NextResponse.json({ ok: true, draftId: draft.id, simulated: false, message: `Brouillon créé dans Gmail (ID: ${draft.id}). Ouvrez Gmail pour compléter et envoyer.` });
  } catch (err) {
    console.error('create-draft error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

