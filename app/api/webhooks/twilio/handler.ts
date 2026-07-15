import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@/lib/supabase/server';

// Twilio signature verification (HMAC-SHA1 over URL + sorted POST params)
function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const sorted = Object.keys(params).sort();
  let str = url;
  for (const key of sorted) str += key + (params[key] ?? '');
  const computed = createHmac('sha1', authToken).update(str).digest('base64');
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get('x-twilio-signature') ?? '';

  // Parse URL-encoded Twilio body
  const text = await req.text();
  const params: Record<string, string> = {};
  for (const pair of text.split('&')) {
    const [k, v] = pair.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }

  // Verify signature — reject if TWILIO_AUTH_TOKEN isn't configured or signature is missing/invalid
  if (!authToken) {
    console.error('[twilio/webhook] TWILIO_AUTH_TOKEN not configured — rejecting request');
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`;
  if (!signature || !verifyTwilioSignature(authToken, url, params, signature)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const messageStatus = params['MessageStatus'];
  const messageSid = params['MessageSid'] ?? params['SmsSid'];

  // ── Status callback (outbound delivery updates) ──────────────────────────
  if (messageStatus) {
    try {
      const supabase = await createClient();
      await supabase
        .from('sms_messages')
        .update({ status: messageStatus, updated_at: new Date().toISOString() })
        .eq('twilio_sid', messageSid);
    } catch {
      // non-blocking
    }
    return new NextResponse('<?xml version="1.0"?><Response/>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  // ── Inbound SMS reply ────────────────────────────────────────────────────
  const from = params['From'] ?? '';
  const body = params['Body'] ?? '';
  const to = params['To'] ?? '';

  if (from && body) {
    try {
      const supabase = await createClient();

      // Try to match lead by phone number (strip non-digits for comparison)
      const digits = from.replace(/\D/g, '');
      const { data: lead } = await supabase
        .from('leads')
        .select('id, workspace_id, business_name')
        .or(`phone.ilike.%${digits.slice(-10)}%`)
        .maybeSingle();

      // Log the inbound SMS
      await supabase.from('sms_messages').insert({
        twilio_sid: messageSid,
        from_number: from,
        to_number: to,
        body,
        direction: 'inbound',
        status: 'received',
        lead_id: lead?.id ?? null,
        workspace_id: lead?.workspace_id ?? null,
      });

      // Create a notification if lead matched
      if (lead?.workspace_id) {
        await supabase.from('notifications').insert({
          workspace_id: lead.workspace_id,
          type: 'sms_reply',
          title: `Réponse SMS — ${lead.business_name}`,
          message: body.slice(0, 120),
          metadata: { from, lead_id: lead.id },
        });
      }
    } catch (err) {
      console.error('[twilio/webhook] inbound error:', err);
    }
  }

  // Always reply with empty TwiML
  return new NextResponse('<?xml version="1.0"?><Response/>', {
    headers: { 'Content-Type': 'text/xml' },
  });
}
