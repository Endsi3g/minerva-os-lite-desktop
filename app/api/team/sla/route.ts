import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

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
