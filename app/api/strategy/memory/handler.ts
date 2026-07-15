import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  computeTimingLearnings,
  computeChannelLearnings,
  computeCampaignLearnings,
} from '@/lib/strategy-memory';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('strategy_memory')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('confidence', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ learnings: data ?? [] });
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
    .select('id, niche, city, last_activity_at, reply_status, nba_channel, campaign_id, status')
    .eq('workspace_id', workspace_id)
    .limit(500);

  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });

  const { data: campaigns } = await supabase
    .from('outreach_campaigns')
    .select('id, name, niches')
    .eq('workspace_id', workspace_id);

  const leadsData = leads ?? [];
  const campaignsData = (campaigns ?? []).map((c) => ({
    id: c.id as string,
    name: (c.name as string) ?? '',
    niches: Array.isArray(c.niches) ? (c.niches as string[]) : [],
  }));

  const timingLearnings = computeTimingLearnings(leadsData);
  const channelLearnings = computeChannelLearnings(leadsData);
  const campaignLearnings = computeCampaignLearnings(campaignsData, leadsData);

  const allLearnings = [...timingLearnings, ...channelLearnings, ...campaignLearnings];

  if (allLearnings.length === 0) {
    return NextResponse.json({ updated: 0, learnings: [] });
  }

  const adminClient = getAdminClient();
  const now = new Date().toISOString();

  const rows = allLearnings.map((l) => ({
    workspace_id,
    memory_type: l.memory_type,
    niche: l.niche ?? null,
    city: l.city ?? null,
    campaign_id: l.campaign_id ?? null,
    insight: l.insight,
    key: l.key,
    value: l.value,
    confidence: l.confidence,
    sample_size: l.sample_size,
    updated_at: now,
  }));

  const { error: upsertError } = await adminClient
    .from('strategy_memory')
    .upsert(rows, { onConflict: 'workspace_id,memory_type,niche,key' });

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({ updated: rows.length, learnings: allLearnings });
}
