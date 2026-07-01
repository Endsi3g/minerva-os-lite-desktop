import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action_id, assignee_user_id, workspace_id } = await req.json().catch(() => ({}));
  if (!action_id || !assignee_user_id || !workspace_id) {
    return NextResponse.json({ error: 'action_id, assignee_user_id et workspace_id requis' }, { status: 400 });
  }

  const admin = getAdminClient();

  const [{ data: assigneeProfile }, { data: action }] = await Promise.all([
    admin
      .from('settings')
      .select('full_name')
      .eq('user_id', assignee_user_id)
      .limit(1)
      .single(),
    admin
      .from('agent_actions')
      .select('lead_id, action_type, reasoning')
      .eq('id', action_id)
      .single(),
  ]);

  const assigneeName = assigneeProfile?.full_name ?? 'Membre';

  const { error: updateError } = await admin
    .from('agent_actions')
    .update({
      assigned_to: assignee_user_id,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', action_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  let leadName: string | null = null;
  if (action?.lead_id) {
    const { data: lead } = await admin
      .from('leads')
      .select('business_name')
      .eq('id', action.lead_id)
      .single();
    leadName = lead?.business_name ?? null;
  }

  await admin.from('notifications').insert({
    workspace_id,
    user_id: assignee_user_id,
    type: 'info',
    title: 'Action NBA assignée par Minerva',
    body: leadName
      ? `Une action ${action?.action_type ?? 'NBA'} vous a été assignée pour ${leadName}.`
      : `Une action NBA vous a été assignée par votre espace de travail.`,
    link: action?.lead_id ? `/leads/${action.lead_id}` : null,
    is_read: false,
  });

  return NextResponse.json({
    success: true,
    message: `Action assignée à ${assigneeName}`,
  });
}
