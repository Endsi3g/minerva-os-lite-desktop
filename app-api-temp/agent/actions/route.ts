import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);

  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const type = req.nextUrl.searchParams.get('type');

  let query = supabase
    .from('agent_actions')
    .select('id, action_type, lead_id, reasoning, autonomy_level, executed, approved, suggested, created_at, assigned_to')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (type) query = query.eq('action_type', type);

  const { data: actions, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leadIds = [...new Set((actions ?? []).map((a: { lead_id: string | null }) => a.lead_id).filter(Boolean))];
  let leadNames: Record<string, string> = {};
  if (leadIds.length > 0) {
    const { data: leads } = await supabase.from('leads').select('id, business_name').in('id', leadIds as string[]);
    (leads ?? []).forEach((l: { id: string; business_name: string | null }) => { leadNames[l.id] = l.business_name ?? ''; });
  }

  const rows = (actions ?? []).map((a: Record<string, unknown>) => ({
    ...a,
    lead_name: a.lead_id ? (leadNames[a.lead_id as string] ?? null) : null,
  }));

  return NextResponse.json({ actions: rows });
}
