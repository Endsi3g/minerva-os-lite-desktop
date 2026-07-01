import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeNbaScore, getActionLabel, type NbaLead, type NicheInsight } from '@/lib/nba-engine';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { lead_id, workspace_id } = body;
  if (!lead_id || !workspace_id) {
    return NextResponse.json({ error: 'lead_id and workspace_id required' }, { status: 400 });
  }

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, business_name, niche, city, status, temperature, next_action_date, last_activity_at, reply_detected_at, reply_status, email_opens_count, email_clicks_count, nba_score, nba_action')
    .eq('id', lead_id)
    .eq('workspace_id', workspace_id)
    .maybeSingle();

  if (leadError || !lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });

  const { data: insight } = await supabase
    .from('agent_insights')
    .select('niche, city, response_rate, booking_rate, recommended_channel, best_cadence_days')
    .eq('workspace_id', workspace_id)
    .eq('niche', lead.niche ?? '')
    .maybeSingle();

  const nbaLead: NbaLead = {
    id: lead.id,
    niche: lead.niche ?? '',
    city: lead.city ?? undefined,
    status: lead.status ?? 'New',
    temperature: lead.temperature ?? 'Cold',
    nextActionDate: lead.next_action_date ?? undefined,
    lastActivityAt: lead.last_activity_at ?? undefined,
    replyDetectedAt: lead.reply_detected_at ?? undefined,
    replyStatus: lead.reply_status ?? null,
    emailOpensCount: lead.email_opens_count ?? 0,
    emailClicksCount: lead.email_clicks_count ?? 0,
  };

  const nicheInsight = insight as NicheInsight | null;
  const nbaResult = computeNbaScore(nbaLead, nicheInsight);

  const prompt = `Tu es Minerva, un assistant commercial IA. Explique pourquoi ce lead est la prochaine meilleure action, en 2-3 phrases concrètes et actionables. Lead: ${lead.business_name ?? 'Inconnu'}, Niche: ${lead.niche ?? 'Non définie'}, Ville: ${lead.city ?? 'Non définie'}, Score NBA: ${nbaResult.score}/100, Signaux: ${nbaResult.reason}, Action recommandée: ${getActionLabel(nbaResult.action)}. Réponds en français, sois direct et prescriptif.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: `Anthropic API error: ${err}` }, { status: 502 });
  }

  const data = await response.json();
  const explanation = data.content?.[0]?.text ?? '';

  return NextResponse.json({ explanation });
}
