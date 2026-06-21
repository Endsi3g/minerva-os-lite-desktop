import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
}

// GET /api/team/members — List all members of the current user's workspace
export async function GET() {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: members, error: fetchError } = await supabase
    .from('team_members')
    .select('*')
    .eq('workspace_owner_id', user.id)
    .order('invited_at', { ascending: false });

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Also fetch profile info for active members
  const enriched = await Promise.all(
    (members || []).map(async (m) => {
      const enrichedMember = {
        ...m,
        plan: m.plan || 'Business',
        usage_count: m.usage_count !== undefined && m.usage_count !== null ? m.usage_count : 0,
        profile: null as { full_name: string | null; company_name: string | null } | null
      };
      if (m.member_user_id) {
        const { data: profile } = await supabase
          .from('settings')
          .select('full_name, company_name')
          .eq('user_id', m.member_user_id)
          .maybeSingle();
        enrichedMember.profile = profile;
      }
      return enrichedMember;
    })
  );

  return NextResponse.json({ members: enriched });
}

// PATCH /api/team/members — Update a member's role, plan, or usage_count (owner only)
export async function PATCH(request: NextRequest) {
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

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { memberId, role, plan, usageCount, customRoleId } = body;

  if (!memberId) {
    return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
  }

  // Verify the caller is the owner of this workspace
  const { data: member } = await supabase
    .from('team_members')
    .select('workspace_owner_id')
    .eq('id', memberId)
    .single();

  if (!member || member.workspace_owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden — only the workspace owner can modify members' }, { status: 403 });
  }

  // Construct updates map
  const updates: Record<string, string | number | null> = {};
  if (role !== undefined && role !== 'custom') {
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    updates.role = role;
  }
  if (customRoleId !== undefined) {
    updates.custom_role_id = customRoleId || null;
    if (!role || role === 'custom') updates.role = 'editor';
  }
  if (plan !== undefined) {
    updates.plan = plan;
  }
  if (usageCount !== undefined) {
    updates.usage_count = parseInt(usageCount, 10) || 0;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No update parameters provided' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('team_members')
    .update(updates)
    .eq('id', memberId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, member: updated });
}

// DELETE /api/team/members?id=<member_id> — Remove a member (owner only)
export async function DELETE(request: NextRequest) {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const memberId = request.nextUrl.searchParams.get('id');
  if (!memberId) {
    return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
  }

  // Ensure the current user is the workspace owner
  const { data: member } = await supabase
    .from('team_members')
    .select('workspace_owner_id')
    .eq('id', memberId)
    .single();

  if (!member || member.workspace_owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden — only the workspace owner can remove members' }, { status: 403 });
  }

  const { error: deleteError } = await supabase
    .from('team_members')
    .delete()
    .eq('id', memberId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
