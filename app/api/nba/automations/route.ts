import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { workspace_id } = body;
  if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const adminClient = getAdminClient();
  const triggered: Array<Record<string, unknown>> = [];

  // Trigger 1: Niche response rate drop
  const { data: coldNiches } = await supabase
    .from('agent_insights')
    .select('id, niche, city, response_rate, leads_count')
    .eq('workspace_id', workspace_id)
    .lt('response_rate', 8)
    .gt('leads_count', 5);

  if (coldNiches) {
    for (const insight of coldNiches) {
      const { data: action } = await adminClient
        .from('agent_actions')
        .insert({
          workspace_id,
          action_type: 'adjust_template',
          reasoning: `Taux de réponse < 8% sur la niche "${insight.niche}"${insight.city ? ` (${insight.city})` : ''} — changer l'approche d'email ou tester un autre canal.`,
          data_signals: { niche: insight.niche, city: insight.city, response_rate: insight.response_rate, leads_count: insight.leads_count },
          suggested: true,
          executed: false,
          autonomy_level: 'suggest',
        })
        .select('id, action_type, reasoning')
        .maybeSingle();

      if (action) triggered.push(action);
    }
  }

  // Trigger 2: Email opened 3x no reply → switch channel
  const { data: hotOpeners } = await supabase
    .from('leads')
    .select('id, business_name, email_opens_count')
    .eq('workspace_id', workspace_id)
    .gte('email_opens_count', 3)
    .is('reply_detected_at', null)
    .not('status', 'in', '("Won","Lost")');

  if (hotOpeners) {
    const { data: existingActions } = await supabase
      .from('agent_actions')
      .select('lead_id')
      .eq('workspace_id', workspace_id)
      .eq('action_type', 'switch_channel')
      .eq('executed', false);

    const alreadyPending = new Set((existingActions ?? []).map(a => a.lead_id));

    for (const lead of hotOpeners) {
      if (alreadyPending.has(lead.id)) continue;

      const { data: action } = await adminClient
        .from('agent_actions')
        .insert({
          workspace_id,
          lead_id: lead.id,
          action_type: 'switch_channel',
          reasoning: `Ouvert ${lead.email_opens_count}x sans réponse — changer de canal (appel ou visite terrain recommandé).`,
          data_signals: { email_opens_count: lead.email_opens_count, business_name: lead.business_name },
          suggested: true,
          executed: false,
          autonomy_level: 'suggest',
        })
        .select('id, action_type, lead_id, reasoning')
        .maybeSingle();

      if (action) triggered.push(action);
    }
  }

  // Trigger 3: Pipeline stagnation > 7 days
  const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: stagnantLeads } = await supabase
    .from('leads')
    .select('id, business_name, updated_at, status')
    .eq('workspace_id', workspace_id)
    .lt('updated_at', staleThreshold)
    .not('status', 'in', '("Won","Lost","New")');

  if (stagnantLeads) {
    const { data: existingNudges } = await supabase
      .from('agent_actions')
      .select('lead_id')
      .eq('workspace_id', workspace_id)
      .eq('action_type', 'pipeline_nudge')
      .eq('executed', false);

    const alreadyNudged = new Set((existingNudges ?? []).map(a => a.lead_id));

    for (const lead of stagnantLeads) {
      if (alreadyNudged.has(lead.id)) continue;

      const days = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 86400000);

      const { data: action } = await adminClient
        .from('agent_actions')
        .insert({
          workspace_id,
          lead_id: lead.id,
          action_type: 'pipeline_nudge',
          reasoning: `Stagnation de ${days} jours dans le statut "${lead.status}" — relancer ou requalifier ce lead.`,
          data_signals: { stagnation_days: days, status: lead.status, business_name: lead.business_name },
          suggested: true,
          executed: false,
          autonomy_level: 'suggest',
        })
        .select('id, action_type, lead_id, reasoning')
        .maybeSingle();

      if (action) triggered.push(action);
    }
  }

  return NextResponse.json({ triggered: triggered.length, actions: triggered });
}
