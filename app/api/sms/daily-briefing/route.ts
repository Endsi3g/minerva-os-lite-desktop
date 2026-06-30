import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  // Protect with CRON_SECRET or Twilio auth token (one-time admin endpoint)
  const secret = req.headers.get('x-briefing-secret') ?? '';
  const expected = process.env.CRON_SECRET || process.env.TWILIO_AUTH_TOKEN;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { to } = await req.json().catch(() => ({ to: null }));
  if (!to) return NextResponse.json({ error: 'to requis' }, { status: 400 });

  // Admin client with service role key (bypasses RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquant' }, { status: 503 });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Fetch all leads
  const { data: leads, error } = await admin
    .from('leads')
    .select('status, temperature, next_action_date, business_name, score')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = new Date().toISOString().split('T')[0];
  const total = leads?.length ?? 0;
  const hot = leads?.filter(l => l.temperature === 'Hot').length ?? 0;
  const warm = leads?.filter(l => l.temperature === 'Warm').length ?? 0;
  const cold = leads?.filter(l => l.temperature === 'Cold').length ?? 0;
  const won = leads?.filter(l => l.status === 'Won').length ?? 0;
  const overdue = leads?.filter(l =>
    l.next_action_date && l.next_action_date <= today &&
    l.status !== 'Won' && l.status !== 'Lost'
  ).length ?? 0;

  const hotLeadNames = leads
    ?.filter(l => l.temperature === 'Hot' && l.next_action_date && l.next_action_date <= today && l.status !== 'Won' && l.status !== 'Lost')
    ?.slice(0, 2)
    ?.map(l => l.business_name)
    ?.join(', ') ?? '';

  // Compose SMS
  const lines = [
    `Minerva OS — Rapport du ${new Date().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    '',
    `📊 Pipeline : ${total} leads total`,
    `🔥 Chauds : ${hot}  |  🌡️ Tièdes : ${warm}  |  ❄️ Froids : ${cold}`,
    `✅ Gagnés : ${won}`,
    '',
    `⚠️ Actions en retard : ${overdue}`,
    hotLeadNames ? `→ Priorité : ${hotLeadNames}` : '',
    '',
    `Bonne journée ! Ouvre Minerva pour les détails.`,
  ].filter(Boolean).join('\n');

  // Send via Twilio
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const apiKeySid = process.env.TWILIO_API_KEY_SID!;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET!;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID!;

  const twilioParams = new URLSearchParams({
    To: to,
    MessagingServiceSid: messagingServiceSid,
    Body: lines,
  });

  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString('base64')}`,
      },
      body: twilioParams.toString(),
    }
  );

  const twilioData = await twilioRes.json();
  if (!twilioRes.ok) {
    return NextResponse.json({ error: twilioData?.message, twilio: twilioData }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    sid: twilioData.sid,
    stats: { total, hot, warm, cold, won, overdue },
    message: lines,
  });
}
