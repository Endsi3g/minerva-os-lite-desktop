import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { computeNbaScore, type NbaLead, type NicheInsight } from '@/lib/nba-engine';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const leadId = req.nextUrl.searchParams.get('lead_id');

  // Single lead query — used by LeadNbaCard
  if (leadId) {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('id, business_name, niche, city, status, temperature, nba_score, nba_action, nba_reason, nba_channel, nba_computed_at')
      .eq('workspace_id', workspaceId)
      .eq('id', leadId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lead: lead ?? null, stale: !lead?.nba_computed_at });
  }

  // Workspace-level top-10 query
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, business_name, niche, city, status, temperature, nba_score, nba_action, nba_reason, nba_channel, nba_computed_at')
    .eq('workspace_id', workspaceId)
    .not('nba_computed_at', 'is', null)
    .order('nba_score', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!leads || leads.length === 0) return NextResponse.json({ leads: [], stale: true });

  return NextResponse.json({ leads, stale: false });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { workspace_id } = body;
  if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, niche, city, last_activity_at, reply_detected_at, reply_status, email_opens_count, status, temperature, next_action_date')
    .eq('workspace_id', workspace_id);

  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });
  if (!leads || leads.length === 0) return NextResponse.json({ updated: 0, top: [] });

  const { data: insights } = await supabase
    .from('agent_insights')
    .select('niche, city, response_rate, booking_rate, recommended_channel, best_cadence_days')
    .eq('workspace_id', workspace_id);

  const insightMap = new Map<string, NicheInsight>();
  if (insights) {
    for (const ins of insights) {
      const key = `${ins.niche}||${ins.city ?? ''}`;
      insightMap.set(key, ins as NicheInsight);
    }
  }

  const adminClient = getAdminClient();
  const now = new Date().toISOString();
  const scored: Array<{ id: string; nba_score: number }> = [];

  for (const lead of leads) {
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
    };

    const nicheKey = `${nbaLead.niche}||${nbaLead.city ?? ''}`;
    const nicheInsight = insightMap.get(nicheKey) ?? insightMap.get(`${nbaLead.niche}||`) ?? null;

    const result = computeNbaScore(nbaLead, nicheInsight);

    await adminClient
      .from('leads')
      .update({
        nba_score: result.score,
        nba_action: result.action,
        nba_reason: result.reason,
        nba_channel: result.channel,
        nba_computed_at: now,
      })
      .eq('id', lead.id);

    scored.push({ id: lead.id, nba_score: result.score });
  }

  scored.sort((a, b) => b.nba_score - a.nba_score);
  const top10Ids = scored.slice(0, 10).map(s => s.id);

  const { data: top } = await supabase
    .from('leads')
    .select('id, business_name, niche, city, status, temperature, nba_score, nba_action, nba_reason, nba_channel, nba_computed_at')
    .in('id', top10Ids)
    .order('nba_score', { ascending: false });

  return NextResponse.json({ updated: leads.length, top: top ?? [] });
}
