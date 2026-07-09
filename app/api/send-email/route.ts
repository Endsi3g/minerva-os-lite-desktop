import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAccessToken } from '@/lib/google/google-auth-service';

function makeMimeMessage(to: string, subject: string, body: string) {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body).toString('base64')
  ];
  const message = messageParts.join('\r\n');
  
  // Base64url encoding for Gmail API raw message payload
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { leadId, subject = 'Prospection', body } = await req.json();
    if (!leadId || !body) {
      return NextResponse.json({ error: 'leadId et body sont requis' }, { status: 400 });
    }

    // 2. Fetch Lead details
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Prospect introuvable' }, { status: 404 });
    }

    const recipientEmail = lead.contact_email;
    if (!recipientEmail) {
      return NextResponse.json({ error: "Ce prospect n'a pas d'adresse e-mail configurée" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return NextResponse.json({ error: "L'adresse e-mail du prospect est invalide" }, { status: 400 });
    }

    // 3. Resolve Google access token (covers both the legacy and current OAuth flows)
    const tokenData = await resolveAccessToken(supabase, user.id);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Connectez votre compte Gmail (Paramètres → Intégrations) avant d\'envoyer un e-mail.' },
        { status: 400 }
      );
    }
    const { accessToken: currentToken, googleEmail } = tokenData;

    // 4. Send email via the real Gmail API — errors propagate to the outer catch, no fake success.
    // Send via Gmail
    const rawMime = makeMimeMessage(recipientEmail, subject, body);
    const gmailResponse = await fetch('https://gmail.googleapis.com/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: rawMime })
    });

    if (!gmailResponse.ok) {
      const gmailErr = await gmailResponse.json();
      throw new Error(gmailErr.error?.message || "Erreur de l'API Gmail");
    }

    const gmailData = await gmailResponse.json();
    if (gmailData.threadId) {
      await supabase
        .from('leads')
        .update({ gmail_thread_id: gmailData.threadId, updated_at: new Date().toISOString() })
        .eq('id', leadId);
    }

    // 5. Post-send automation: update lead status & append note log
    const nextActionDate = new Date();
    nextActionDate.setDate(nextActionDate.getDate() + 3); // Auto schedule next action in 3 days

    const { error: updateErr } = await supabase
      .from('leads')
      .update({
        status: 'Contacted',
        next_action: 'Relance e-mail / Appel téléphonique suite à premier contact',
        next_action_date: nextActionDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateErr) throw updateErr;

    // Append historical note
    const logText = `E-mail envoyé via Gmail API (compte ${googleEmail || 'connecté'}) :\n\nSujet : ${subject}\n\n${body}`;

    const { error: noteErr } = await supabase
      .from('notes')
      .insert({
        lead_id: leadId,
        user_id: user.id,
        workspace_id: lead.workspace_id,
        type: 'email',
        content: logText
      });

    if (noteErr) throw noteErr;

    // 6. Auto-create or update contact for this lead in the contacts table
    let contactCreated = false;
    try {
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('workspace_id', lead.workspace_id)
        .eq('email', recipientEmail)
        .maybeSingle();

      if (!existingContact) {
        const { error: contactErr } = await supabase
          .from('contacts')
          .insert({
            workspace_id: lead.workspace_id,
            user_id: user.id,
            name: lead.contact_name || lead.business_name || recipientEmail,
            email: recipientEmail,
            phone: lead.phone || null,
            company: lead.business_name || null,
            lead_id: leadId,
            source: 'email_sent',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (!contactErr) contactCreated = true;
      }
    } catch (contactEx) {
      // Non-critical: contact creation failure should not block email success response
      console.warn('Auto-contact creation failed:', contactEx);
    }

    return NextResponse.json({
      success: true,
      recipient: recipientEmail,
      status: 'Contacted',
      contactCreated,
    });

  } catch (err) {
    console.error("Error in send-email API endpoint:", err);
    const msg = err instanceof Error ? err.message : 'Erreur interne du serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
