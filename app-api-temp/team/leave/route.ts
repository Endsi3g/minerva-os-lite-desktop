// POST /api/team/leave — Current user leaves a team they were invited to.
// Deletes the team_members row where member_user_id = current user.
// The workspace_owner_id param identifies which workspace to leave.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { workspaceOwnerId } = body;
  if (!workspaceOwnerId) {
    return NextResponse.json({ error: 'workspaceOwnerId required' }, { status: 400 });
  }

  // Don't allow the workspace owner to leave their own workspace
  if (workspaceOwnerId === user.id) {
    return NextResponse.json({ error: 'Le propriétaire ne peut pas quitter son propre espace de travail.' }, { status: 400 });
  }

  const admin = adminClient();
  const { error } = await admin
    .from('team_members')
    .delete()
    .eq('member_user_id', user.id)
    .eq('workspace_owner_id', workspaceOwnerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
