import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find pending membership by email
    const { data: memberships, error: memErr } = await supabase
      .from('team_members')
      .select('id, workspace_owner_id, workspace_id, role')
      .eq('email', user.email!.toLowerCase())
      .eq('status', 'pending');

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ error: 'No pending invitation found' }, { status: 404 });
    }

    const results = [];
    for (const membership of memberships) {
      // If workspace_id is still null, resolve it now from the owner's workspace
      let workspaceId = membership.workspace_id;
      if (!workspaceId) {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', membership.workspace_owner_id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        workspaceId = ws?.id ?? null;
      }

      const { error: updateErr } = await supabase
        .from('team_members')
        .update({
          member_user_id: user.id,
          status: 'active',
          workspace_id: workspaceId,
        })
        .eq('id', membership.id);

      if (updateErr) {
        console.error('Error activating membership:', updateErr);
        continue;
      }

      // Fetch workspace details for the response
      let workspaceName = 'Workspace';
      let ownerName = 'Utilisateur';
      if (workspaceId) {
        const { data: wsData } = await supabase
          .from('workspaces')
          .select('name, owner_id')
          .eq('id', workspaceId)
          .maybeSingle();
        if (wsData) {
          workspaceName = wsData.name;
          const { data: ownerSettings } = await supabase
            .from('settings')
            .select('full_name')
            .eq('user_id', wsData.owner_id)
            .maybeSingle();
          ownerName = ownerSettings?.full_name || ownerName;
        }
      }

      results.push({ workspaceId, workspaceName, ownerName, role: membership.role });
    }

    return NextResponse.json({ success: true, memberships: results });
  } catch (err) {
    console.error('accept-invite error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
