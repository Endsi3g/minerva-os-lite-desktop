import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

// Verify Resend/Svix webhook signature
function verifySignature(payload: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true; // Allow in dev without secret

  // Svix signature format: whsec_base64encodedvalue
  const rawSecret = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret);

  const msgId = headers.get('svix-id') ?? '';
  const msgTimestamp = headers.get('svix-timestamp') ?? '';
  const msgSignature = headers.get('svix-signature') ?? '';

  if (!msgId || !msgTimestamp || !msgSignature) return false;

  // Replay attack prevention — reject messages older than 5 minutes
  const ts = parseInt(msgTimestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const toSign = `${msgId}.${msgTimestamp}.${payload}`;
  const computed = createHmac('sha256', rawSecret).update(toSign).digest('base64');

  // svix-signature may contain multiple sigs (v1,<base64> format)
  const signatures = msgSignature.split(' ').map((s) => s.split(',')[1]).filter(Boolean);
  return signatures.some((sig) => {
    try {
      return timingSafeEqual(Buffer.from(computed), Buffer.from(sig));
    } catch {
      return false;
    }
  });
}

// Map Resend event type to human-readable label + notification type
const EVENT_MAP: Record<string, { label: string; type: string; important: boolean }> = {
  'email.sent':             { label: 'Email envoyé',        type: 'email_sent',     important: false },
  'email.delivered':        { label: 'Email délivré',       type: 'email_delivered',important: false },
  'email.delivery_delayed': { label: 'Livraison retardée',  type: 'email_delayed',  important: true  },
  'email.complained':       { label: 'Email signalé spam',  type: 'email_spam',     important: true  },
  'email.bounced':          { label: 'Email rebondi',       type: 'email_bounced',  important: true  },
  'email.opened':           { label: 'Email ouvert',        type: 'email_opened',   important: false },
  'email.clicked':          { label: 'Lien cliqué',         type: 'email_clicked',  important: true  },
  'email.unsubscribed':     { label: 'Désabonnement',       type: 'email_unsub',    important: true  },
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySignature(rawBody, req.headers)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType: string = event.type ?? '';
  const data = event.data ?? {};
  const toEmail: string = data.to?.[0] ?? data.to ?? '';
  const subject: string = data.subject ?? '';
  const emailId: string = data.email_id ?? event.id ?? '';

  const meta = EVENT_MAP[eventType];
  if (!meta) return NextResponse.json({ ok: true, skipped: 'unknown event type' });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Find the lead whose email matches toEmail (best-effort)
  let leadId: string | null = null;
  let workspaceId: string | null = null;
  let userId: string | null = null;

  if (toEmail) {
    const { data: lead } = await admin
      .from('leads')
      .select('id, workspace_id, user_id')
      .eq('contact_email', toEmail)
      .limit(1)
      .maybeSingle();
    if (lead) {
      leadId = lead.id;
      workspaceId = lead.workspace_id;
      userId = lead.user_id;
    }
  }

  // Update email_queue status if matched by resend email_id
  if (emailId) {
    await admin
      .from('email_queue')
      .update({
        status: eventType === 'email.bounced' ? 'failed'
               : eventType === 'email.delivered' ? 'sent'
               : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('resend_id', emailId);
  }

  // Log the webhook event (best-effort — table may not exist yet)
  try {
    await admin.from('email_events').insert({
      id: crypto.randomUUID(),
      resend_email_id: emailId,
      event_type: eventType,
      to_email: toEmail,
      subject,
      lead_id: leadId,
      workspace_id: workspaceId,
      raw: event,
      created_at: new Date().toISOString(),
    });
  } catch { /* non-blocking */ }

  // Create in-app notification for important events only
  if (meta.important && userId && workspaceId) {
    const now = new Date().toISOString();
    await admin.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      workspace_id: workspaceId,
      type: meta.type,
      title: meta.label,
      body: `${subject ? `"${subject}" — ` : ''}${toEmail}`,
      link: leadId ? `/leads/${leadId}` : '/outreach',
      is_read: false,
      created_at: now,
      updated_at: now,
    });
  }

  return NextResponse.json({ ok: true, event: eventType, lead_id: leadId });
}
