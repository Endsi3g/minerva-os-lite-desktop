import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase/admin';
import { serverCache } from '@/lib/server-cache';

const MEMBERS_TTL_MS = 30_000; // 30 s

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
export async function GET(request: NextRequest) {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ownerUserId = request.nextUrl.searchParams.get('ownerUserId') || user.id;

  // Return cached response if available (avoids repeated DB round-trips from sidebar/presence)
  const cacheKey = `team:members:${ownerUserId}`;
  const cached = serverCache.get<object>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const admin = getAdminClient();

  if (ownerUserId !== user.id) {
    const { data: membership } = await admin
      .from('team_members')
      .select('id')
      .eq('workspace_owner_id', ownerUserId)
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
  }

  const { data: members, error: fetchError } = await admin
    .from('team_members')
    .select('*')
    .eq('workspace_owner_id', ownerUserId)
    .order('invited_at', { ascending: false });

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Batch-load all member profiles in a single query instead of N individual queries
  const memberUserIds = (members || []).map((m) => m.member_user_id).filter(Boolean) as string[];
  const allUserIds = [...new Set([...memberUserIds, ownerUserId])];

  const [{ data: profiles }, ownerAuth] = await Promise.all([
    admin
      .from('settings')
      .select('user_id, full_name, company_name, avatar_base64')
      .in('user_id', allUserIds),
    admin.auth.admin.getUserById(ownerUserId),
  ]);

  const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

  const enriched = (members || []).map((m) => ({
    ...m,
    plan: m.plan || 'Business',
    usage_count: m.usage_count ?? 0,
    profile: m.member_user_id ? (profileMap.get(m.member_user_id) ?? null) : null,
  }));

  // Deduplicate rows — keep active over pending, drop rows matching the owner
  const seen = new Map<string, typeof enriched[number]>();
  for (const m of enriched) {
    if (m.member_user_id && m.member_user_id === ownerUserId) continue;
    const key = m.member_user_id || `email:${(m.email || '').toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing || (existing.status !== 'active' && m.status === 'active')) {
      seen.set(key, m);
    }
  }
  const deduped = Array.from(seen.values());

  const ownerEntry = {
    id: `__owner__${ownerUserId}`,
    workspace_owner_id: ownerUserId,
    member_user_id: ownerUserId,
    email: ownerAuth.data?.user?.email || '',
    role: 'admin' as const,
    status: 'active' as const,
    invited_at: null,
    joined_at: null,
    plan: 'Business',
    usage_count: 0,
    profile: profileMap.get(ownerUserId) ?? null,
    isOwner: true,
  };

  const payload = { members: [ownerEntry, ...deduped] };
  serverCache.set(cacheKey, payload, MEMBERS_TTL_MS);
  return NextResponse.json(payload);
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
  const { memberId, role, plan, usageCount } = body;

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
  if (role !== undefined) {
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    updates.role = role;
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

  // Invalidate cached member list so the next GET reflects the change
  serverCache.deleteByPrefix(`team:members:`);
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

  serverCache.deleteByPrefix(`team:members:`);
  return NextResponse.json({ success: true });
}
