import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// GET — audit all workspaces + data counts for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();

  // 1. Owned workspaces
  const { data: owned } = await admin
    .from('workspaces')
    .select('id, name, owner_id, created_at')
    .eq('owner_id', user.id);

  // 2. Member workspaces
  const { data: memberships } = await admin
    .from('team_members')
    .select('workspace_id')
    .eq('member_user_id', user.id);

  const memberWsIds = (memberships || []).map((m: any) => m.workspace_id).filter(Boolean);
  const { data: memberWs } = memberWsIds.length > 0
    ? await admin.from('workspaces').select('id, name, owner_id, created_at').in('id', memberWsIds)
    : { data: [] };

  // Deduplicate
  const allWsMap = new Map<string, any>();
  for (const w of [...(owned || []), ...(memberWs || [])]) {
    allWsMap.set(w.id, { ...w, isOwner: w.owner_id === user.id });
  }
  const allWs = [...allWsMap.values()];

  // 3. Count data per workspace
  const results = await Promise.all(allWs.map(async (w) => {
    const [
      { count: leadsCount },
      { count: teamCount },
      { count: tasksCount },
    ] = await Promise.all([
      admin.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', w.id),
      admin.from('team_members').select('*', { count: 'exact', head: true }).eq('workspace_id', w.id),
      admin.from('tasks').select('*', { count: 'exact', head: true }).eq('workspace_id', w.id),
    ]);
    return { ...w, leadsCount: leadsCount ?? 0, teamCount: teamCount ?? 0, tasksCount: tasksCount ?? 0 };
  }));

  // 4. Current active_workspace_id
  const { data: settings } = await admin
    .from('settings')
    .select('active_workspace_id, workspace_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const sorted = results.sort((a, b) => b.leadsCount - a.leadsCount);
  const recommended = sorted[0];

  return NextResponse.json({
    userId: user.id,
    currentActiveWorkspaceId: settings?.active_workspace_id ?? settings?.workspace_id ?? null,
    workspaces: sorted,
    recommended: recommended?.id ?? null,
  });
}

// POST — force switch to a specific workspace
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workspaceId } = await req.json();
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId requis' }, { status: 400 });

  const admin = getAdminClient();

  // Verify user has access
  const { data: ws } = await admin.from('workspaces').select('id, owner_id').eq('id', workspaceId).maybeSingle();
  const { data: membership } = await admin.from('team_members').select('id').eq('workspace_id', workspaceId).eq('member_user_id', user.id).maybeSingle();

  if (!ws || (ws.owner_id !== user.id && !membership)) {
    return NextResponse.json({ error: 'Accès refusé à ce workspace' }, { status: 403 });
  }

  // Update active_workspace_id in settings
  await admin.from('settings').upsert({
    user_id: user.id,
    active_workspace_id: workspaceId,
    workspace_id: workspaceId,
  }, { onConflict: 'user_id' });

  return NextResponse.json({ ok: true, workspaceId });
}
