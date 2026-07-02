import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { lead_id, workspace_id, from_channel, to_channel, reason } = body;

  if (!lead_id || !workspace_id || !from_channel || !to_channel) {
    return NextResponse.json(
      { error: 'lead_id, workspace_id, from_channel, to_channel required' },
      { status: 400 }
    );
  }

  const admin = getAdminClient();

  const { data: action, error: actionError } = await admin
    .from('agent_actions')
    .insert({
      lead_id,
      workspace_id,
      action_type: 'switch_channel',
      priority: 'high',
      suggested: true,
      executed: false,
      approved: null,
      metadata: { from_channel, to_channel, reason: reason ?? null },
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (actionError) {
    return NextResponse.json({ error: actionError.message }, { status: 500 });
  }

  const { error: leadError } = await admin
    .from('leads')
    .update({ nba_channel: to_channel })
    .eq('id', lead_id);

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, action_id: action.id });
}
