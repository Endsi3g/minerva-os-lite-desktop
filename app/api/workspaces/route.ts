import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase/admin';

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

export async function GET() {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch workspaces owned by user
  const { data: owned, error: ownedErr } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id);

  if (ownedErr) {
    return NextResponse.json({ error: ownedErr.message }, { status: 500 });
  }

  // Fetch memberships via admin client (bypasses RLS, works even if workspace_id is NULL)
  const adminClient = getAdminClient();
  const { data: memberships } = await adminClient
    .from('team_members')
    .select('id, workspace_id, workspace_owner_id, joined_at')
    .eq('member_user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: false }); // most recently joined first

  // Map membership metadata by workspace_id for joined_at ordering
  const membershipMeta: Record<string, string> = {};
  const memberWorkspaces: { id: string; name: string; owner_id: string; created_at: string }[] = [];

  if (memberships && memberships.length > 0) {
    const directIds = memberships.map((m: any) => m.workspace_id).filter(Boolean) as string[];
    const ownerFallbacks = memberships
      .filter((m: any) => !m.workspace_id && m.workspace_owner_id)
      .map((m: any) => ({ rowId: m.id, ownerId: m.workspace_owner_id as string, joinedAt: m.joined_at as string }));

    // Record joined_at per workspace_id for ordering
    memberships.forEach((m: any) => {
      if (m.workspace_id) membershipMeta[m.workspace_id] = m.joined_at;
    });

    // Fetch workspaces by direct workspace_id
    if (directIds.length > 0) {
      const { data: ws } = await adminClient.from('workspaces').select('*').in('id', directIds);
      if (ws) memberWorkspaces.push(...ws);
    }

    // Fallback: resolve workspace by owner_id when workspace_id is NULL, and auto-fix the row
    if (ownerFallbacks.length > 0) {
      const ownerIds = ownerFallbacks.map(f => f.ownerId);
      const { data: ws } = await adminClient.from('workspaces').select('*').in('owner_id', ownerIds);
      if (ws) {
        for (const w of ws) {
          memberWorkspaces.push(w);
          membershipMeta[w.id] = ownerFallbacks.find(f => f.ownerId === w.owner_id)?.joinedAt ?? '';
          // Auto-fix: backfill workspace_id so RLS works on next load
          const row = ownerFallbacks.find(f => f.ownerId === w.owner_id);
          if (row) {
            await adminClient
              .from('team_members')
              .update({ workspace_id: w.id })
              .eq('id', row.rowId);
          }
        }
      }
    }
  }

  // Combine: owned first, then member workspaces sorted by joined_at DESC (most recent first)
  memberWorkspaces.sort((a, b) => {
    const tA = membershipMeta[a.id] ?? '';
    const tB = membershipMeta[b.id] ?? '';
    return tB.localeCompare(tA);
  });

  const allWorkspaces = [
    ...(owned || []).map(w => ({ ...w, isOwner: true, role: 'owner' })),
    ...memberWorkspaces.map(w => ({ ...w, isOwner: false, role: 'member', joinedAt: membershipMeta[w.id] ?? null }))
  ];

  // Batch-load owner names in a single query instead of N individual queries
  const ownerIds = [...new Set(allWorkspaces.map((w) => w.owner_id))];
  const [{ data: ownerSettings }, activeWsResult] = await Promise.all([
    adminClient.from('settings').select('user_id, full_name').in('user_id', ownerIds),
    adminClient.from('settings').select('active_workspace_id').eq('user_id', user.id).maybeSingle(),
  ]);
  const ownerNameMap = new Map((ownerSettings || []).map((s) => [s.user_id, s.full_name]));

  const enriched = allWorkspaces.map((w) => ({
    ...w,
    ownerName: ownerNameMap.get(w.owner_id) || 'Utilisateur anonyme',
  }));

  let activeWorkspaceId: string | null = null;
  try {
    activeWorkspaceId = (activeWsResult.data as any)?.active_workspace_id ?? null;
  } catch {
    // Column doesn't exist yet — ignore
  }

  return NextResponse.json({ workspaces: enriched, activeWorkspaceId });
}

// PATCH — persist active workspace preference to Supabase settings
export async function PATCH(request: NextRequest) {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { activeWorkspaceId } = await request.json();
  if (!activeWorkspaceId) {
    return NextResponse.json({ error: 'activeWorkspaceId requis' }, { status: 400 });
  }

  try {
    const adminClient = getAdminClient();
    const { error: upsertError } = await adminClient
      .from('settings')
      .upsert({ user_id: user.id, active_workspace_id: activeWorkspaceId }, { onConflict: 'user_id' });

    if (upsertError) {
      // Column may not exist yet (migration pending) — return success anyway, preference will be loaded from memberships
      return NextResponse.json({ success: true, note: 'preference_pending_migration' });
    }
  } catch {
    return NextResponse.json({ success: true, note: 'preference_pending_migration' });
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Nom du workspace requis' }, { status: 400 });
  }

  const { data: workspace, error: insertError } = await supabase
    .from('workspaces')
    .insert({
      name: name.trim(),
      owner_id: user.id
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, workspace }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, name, description, tag, accent_color, logo_base64 } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }

  // Check ownership
  const { data: existing } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (!existing || existing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Accès interdit — seul le propriétaire peut modifier le workspace' }, { status: 403 });
  }

  const updateFields: any = {};
  if (name !== undefined) updateFields.name = name.trim();
  if (description !== undefined) updateFields.description = description;
  if (tag !== undefined) updateFields.tag = tag;
  if (accent_color !== undefined) updateFields.accent_color = accent_color;
  if (logo_base64 !== undefined) updateFields.logo_base64 = logo_base64;

  const { data: updated, error: updateError } = await supabase
    .from('workspaces')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, workspace: updated });
}

export async function DELETE(request: NextRequest) {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }

  // Check ownership
  const { data: existing } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (!existing || existing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Accès interdit — seul le propriétaire peut supprimer le workspace' }, { status: 403 });
  }

  // Count owned workspaces to ensure we do not delete the last one
  const { count } = await supabase
    .from('workspaces')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id);

  if (count !== null && count <= 1) {
    return NextResponse.json({ error: 'Impossible de supprimer votre dernier workspace' }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
