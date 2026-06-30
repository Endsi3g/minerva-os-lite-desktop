import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !apiKeySid || !apiKeySecret || !messagingServiceSid) {
    return NextResponse.json({ error: 'Twilio non configuré. Ajouter les variables TWILIO_* dans Vercel.' }, { status: 503 });
  }

  const { to, body, leadId } = await req.json();
  if (!to || !body) {
    return NextResponse.json({ error: 'to et body sont requis.' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const statusCallback = appUrl ? `${appUrl}/api/webhooks/twilio` : undefined;

  const params = new URLSearchParams({
    To: to,
    MessagingServiceSid: messagingServiceSid,
    Body: body,
    ...(statusCallback ? { StatusCallback: statusCallback } : {}),
  });

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64')}`,
      },
      body: params.toString(),
    }
  );

  const data = await resp.json();

  if (!resp.ok) {
    console.error('[sms/send] Twilio error:', data);
    return NextResponse.json({ error: data?.message ?? 'Erreur Twilio' }, { status: resp.status });
  }

  // Log to sms_messages table (non-blocking)
  try {
    const supabase = await createClient();
    await supabase.from('sms_messages').insert({
      twilio_sid: data.sid,
      from_number: data.from,
      to_number: to,
      body,
      direction: 'outbound',
      status: data.status,
      lead_id: leadId ?? null,
    });
  } catch {
    // non-blocking
  }

  return NextResponse.json({ ok: true, sid: data.sid, status: data.status });
}
