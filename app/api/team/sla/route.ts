import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const admin = getAdminClient();
  const now = new Date();
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: actions } = await admin
    .from('agent_actions')
    .select('id, action_type, lead_id, sla_due_at, sla_breached_at, created_at')
    .eq('workspace_id', workspaceId)
    .eq('executed', false)
    .not('sla_due_at', 'is', null)
    .order('sla_due_at', { ascending: true })
    .limit(20);

  const rows = actions ?? [];
  const nowIso = now.toISOString();

  const breached = rows.filter((a) => a.sla_due_at < nowIso);
  const urgent = rows.filter((a) => a.sla_due_at >= nowIso && a.sla_due_at <= in2h);
  const warning = rows.filter((a) => a.sla_due_at > in2h && a.sla_due_at <= in24h);

  const leadIds = [...new Set(rows.map((a) => a.lead_id).filter(Boolean))];
  let leadNames: Record<string, string> = {};
  if (leadIds.length > 0) {
    const { data: leadsData } = await admin.from('leads').select('id, business_name').in('id', leadIds);
    (leadsData ?? []).forEach((l) => { leadNames[l.id] = l.business_name; });
  }

  const top5 = [...breached, ...urgent].slice(0, 5).map((a) => ({
    id: a.id,
    action_type: a.action_type,
    lead_name: leadNames[a.lead_id] ?? null,
    sla_due_at: a.sla_due_at,
    is_breached: a.sla_due_at < nowIso,
  }));

  return NextResponse.json({ breached: breached.length, urgent: urgent.length, warning: warning.length, top5 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const workspaceId: string | undefined = body.workspace_id;
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const admin = getAdminClient();

  const { data: breachedActions } = await admin
    .from('agent_actions')
    .select('id, action_type, lead_id')
    .eq('workspace_id', workspaceId)
    .eq('executed', false)
    .lt('sla_due_at', new Date().toISOString())
    .is('sla_breached_at', null);

  if (!breachedActions || breachedActions.length === 0) {
    return NextResponse.json({ breached: 0 });
  }

  const now = new Date().toISOString();
  const ids = breachedActions.map((a) => a.id);

  await admin
    .from('agent_actions')
    .update({ sla_breached_at: now })
    .in('id', ids);

  const leadIds = [...new Set(breachedActions.map((a) => a.lead_id).filter(Boolean))];
  let leadNames: Record<string, string> = {};
  if (leadIds.length > 0) {
    const { data: leadsData } = await admin
      .from('leads')
      .select('id, business_name')
      .in('id', leadIds);
    (leadsData ?? []).forEach((l) => { leadNames[l.id] = l.business_name; });
  }

  const notifications = breachedActions.map((action) => ({
    workspace_id: workspaceId,
    user_id: user.id,
    type: 'info' as const,
    title: 'SLA dépassé — action en attente',
    body: `L'action "${action.action_type}" sur "${leadNames[action.lead_id] ?? 'un lead'}" dépasse le délai imparti.`,
    read: false,
  }));

  await admin.from('notifications').insert(notifications);

  return NextResponse.json({ breached: breachedActions.length });
}
