// GET /api/team/my-permissions?workspaceOwnerId=<id>
// Returns the current user's role and effective permissions for a given workspace.
// If the user IS the workspace owner → role = 'owner', all permissions granted.
// If the user is a member → look up their team_members row, resolve custom role if any.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { DEFAULT_ROLE_PERMISSIONS, ALL_MODULES, type PermissionModule } from '@/lib/permissions';

// Accounts with unconditional full access across all workspaces
const PRIVILEGED_EMAILS = ['theuprisingstudio@gmail.com', 'quebecsaas@gmail.com'];

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Privileged accounts always get full owner access regardless of workspace membership
  if (PRIVILEGED_EMAILS.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ role: 'owner', permissions: ALL_MODULES });
  }

  const workspaceOwnerId = req.nextUrl.searchParams.get('workspaceOwnerId');
  if (!workspaceOwnerId) {
    return NextResponse.json({ role: 'owner', permissions: ALL_MODULES });
  }

  // If the current user IS the workspace owner
  if (workspaceOwnerId === user.id) {
    return NextResponse.json({ role: 'owner', permissions: ALL_MODULES });
  }

  const admin = adminClient();

  // Look up this user's membership
  const { data: member } = await admin
    .from('team_members')
    .select('role, custom_role_id')
    .eq('workspace_owner_id', workspaceOwnerId)
    .eq('member_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!member) {
    // Not a member — grant viewer-like access
    return NextResponse.json({ role: 'viewer', permissions: DEFAULT_ROLE_PERMISSIONS['viewer'] });
  }

  // If they have a custom role, use its permissions
  if (member.custom_role_id) {
    const { data: customRole } = await admin
      .from('workspace_roles')
      .select('name, permissions')
      .eq('id', member.custom_role_id)
      .maybeSingle();

    if (customRole) {
      return NextResponse.json({
        role: customRole.name,
        permissions: (customRole.permissions as PermissionModule[]) || [],
      });
    }
  }

  const role = member.role || 'viewer';
  const permissions = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS['viewer'];
  return NextResponse.json({ role, permissions });
}
