import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('agent_insights')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('response_rate', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ insights: data ?? [] });
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
    .select('niche, city, reply_status')
    .eq('workspace_id', workspace_id);

  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });
  if (!leads || leads.length === 0) return NextResponse.json({ upserted: 0 });

  const { data: drafts } = await supabase
    .from('drafts')
    .select('lead_id')
    .eq('workspace_id', workspace_id);

  const draftCountByLead = new Map<string, number>();
  if (drafts) {
    for (const d of drafts) {
      if (!d.lead_id) continue;
      draftCountByLead.set(d.lead_id, (draftCountByLead.get(d.lead_id) ?? 0) + 1);
    }
  }

  type NicheKey = string;
  const groups = new Map<NicheKey, { leads: number; positiveReplies: number }>();

  for (const lead of leads) {
    const key: NicheKey = `${lead.niche ?? 'Unknown'}||${lead.city ?? ''}`;
    const existing = groups.get(key) ?? { leads: 0, positiveReplies: 0 };
    existing.leads++;
    if (lead.reply_status === 'positive') existing.positiveReplies++;
    groups.set(key, existing);
  }

  const totalEmailsSent = Array.from(draftCountByLead.values()).reduce((acc, v) => acc + v, 0);
  const adminClient = getAdminClient();
  let upserted = 0;

  for (const [key, stats] of groups.entries()) {
    const [niche, city] = key.split('||');
    const emailsSentEstimate = Math.round((stats.leads / Math.max(leads.length, 1)) * totalEmailsSent);
    const responseRate = (stats.positiveReplies / Math.max(emailsSentEstimate, 1)) * 100;
    const recommendedChannel = responseRate < 8 ? 'call' : 'email';

    const { error: upsertError } = await adminClient
      .from('agent_insights')
      .upsert(
        {
          workspace_id,
          niche,
          city: city || null,
          leads_count: stats.leads,
          emails_sent: emailsSentEstimate,
          positive_replies: stats.positiveReplies,
          response_rate: Math.min(100, parseFloat(responseRate.toFixed(2))),
          recommended_channel: recommendedChannel,
          last_computed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,niche,city' }
      );

    if (!upsertError) upserted++;
  }

  return NextResponse.json({ upserted });
}
