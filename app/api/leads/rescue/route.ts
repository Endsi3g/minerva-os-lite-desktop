import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { computeNbaScore, type NbaLead, type NicheInsight } from '@/lib/nba-engine';

const STALE_CACHE_MS = 24 * 60 * 60 * 1000; // recompute nba_* once per day per lead

// Lead Rescue Center — surfaces leads that have gone quiet (no reply, no recent activity,
// not already Won/Lost) so they can be bulk re-engaged instead of silently rotting in the pipeline.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, business_name, niche, city, status, temperature, last_activity_at, reply_detected_at, reply_status, email_opens_count, next_action_date, nba_score, nba_action, nba_reason, nba_channel, nba_computed_at')
    .eq('workspace_id', workspaceId)
    .not('status', 'in', '("Won","Lost")');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!leads || leads.length === 0) return NextResponse.json({ leads: [] });

  const { data: insights } = await supabase
    .from('agent_insights')
    .select('niche, city, response_rate, booking_rate, recommended_channel, best_cadence_days')
    .eq('workspace_id', workspaceId);

  const insightMap = new Map<string, NicheInsight>();
  for (const ins of insights ?? []) {
    insightMap.set(`${ins.niche}||${ins.city ?? ''}`, ins as NicheInsight);
  }

  const admin = getAdminClient();
  const now = Date.now();
  const results: Array<{ id: string; business_name: string; niche: string; city: string | null; status: string; temperature: string; nba_score: number; nba_action: string; nba_reason: string; nba_channel: string; daysSinceContact: number }> = [];

  for (const lead of leads) {
    const isStale = !lead.nba_computed_at || now - new Date(lead.nba_computed_at).getTime() > STALE_CACHE_MS;

    let score = lead.nba_score ?? 0;
    let action = lead.nba_action ?? 'nurture';
    let reason = lead.nba_reason ?? '';
    let channel = lead.nba_channel ?? 'email';
    let daysSinceContact = 0;

    const lastContact = lead.last_activity_at || lead.next_action_date;
    daysSinceContact = lastContact ? Math.floor((now - new Date(lastContact).getTime()) / 86400000) : 30;

    if (isStale) {
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
      const nicheInsight = insightMap.get(`${nbaLead.niche}||${nbaLead.city ?? ''}`) ?? insightMap.get(`${nbaLead.niche}||`) ?? null;
      const computed = computeNbaScore(nbaLead, nicheInsight);
      score = computed.score;
      action = computed.action;
      reason = computed.reason;
      channel = computed.channel;

      await admin.from('leads').update({
        nba_score: score,
        nba_action: action,
        nba_reason: reason,
        nba_channel: channel,
        nba_computed_at: new Date().toISOString(),
      }).eq('id', lead.id);
    }

    // Rescue-worthy: engine flagged it as low-priority (nurture/pause), or it's been
    // genuinely quiet for a while — either signal alone is enough to surface it here.
    if (action === 'nurture' || action === 'pause' || daysSinceContact > 14) {
      results.push({
        id: lead.id,
        business_name: lead.business_name,
        niche: lead.niche,
        city: lead.city ?? null,
        status: lead.status,
        temperature: lead.temperature,
        nba_score: score,
        nba_action: action,
        nba_reason: reason,
        nba_channel: channel,
        daysSinceContact,
      });
    }
  }

  results.sort((a, b) => b.daysSinceContact - a.daysSinceContact);

  return NextResponse.json({ leads: results.slice(0, 100) });
}
