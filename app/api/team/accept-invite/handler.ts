import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

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
      return NextResponse.json({ message: 'No pending invitation found', activated: 0 }, { status: 200 });
    }

    const admin = getAdminClient();
    const results = [];
    for (const membership of memberships) {
      // If workspace_id is still null, resolve it now from the owner's workspace
      let workspaceId = membership.workspace_id;
      if (!workspaceId) {
        const { data: ws } = await admin
          .from('workspaces')
          .select('id')
          .eq('owner_id', membership.workspace_owner_id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        workspaceId = ws?.id ?? null;
      }

      const { error: updateErr } = await admin
        .from('team_members')
        .update({
          member_user_id: user.id,
          status: 'active',
          joined_at: new Date().toISOString(),
          workspace_id: workspaceId,
        })
        .eq('id', membership.id);

      if (updateErr) {
        console.error('Error activating membership:', updateErr);
        continue;
      }

      // Auto-switch invited user to the inviter's workspace
      if (workspaceId) {
        await admin
          .from('settings')
          .upsert({ user_id: user.id, active_workspace_id: workspaceId }, { onConflict: 'user_id' });
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
