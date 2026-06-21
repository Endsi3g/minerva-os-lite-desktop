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

  // Fetch workspaces where user is active team member
  const { data: memberships, error: memErr } = await supabase
    .from('team_members')
    .select('workspace_id')
    .eq('member_user_id', user.id)
    .eq('status', 'active');

  let memberWorkspaces: { id: string; name: string; owner_id: string; created_at: string }[] = [];
  if (!memErr && memberships && memberships.length > 0) {
    const workspaceIds = memberships.map(m => m.workspace_id).filter(Boolean);
    if (workspaceIds.length > 0) {
      const { data: memberWs } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds);
      if (memberWs) memberWorkspaces = memberWs;
    }
  }

  // Combine workspaces
  const allWorkspaces = [
    ...(owned || []).map(w => ({ ...w, isOwner: true, role: 'owner' })),
    ...memberWorkspaces.map(w => ({ ...w, isOwner: false, role: 'member' }))
  ];

  // Enrich with owner full name
  const enriched = await Promise.all(
    allWorkspaces.map(async (w) => {
      const { data: ownerSettings } = await supabase
        .from('settings')
        .select('full_name')
        .eq('user_id', w.owner_id)
        .maybeSingle();
      return {
        ...w,
        ownerName: ownerSettings?.full_name || 'Utilisateur anonyme'
      };
    })
  );

  // Read active workspace preference from Supabase settings (no localStorage)
  const { data: userSettings } = await supabase
    .from('settings')
    .select('active_workspace_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const activeWorkspaceId = userSettings?.active_workspace_id ?? null;

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

  const { error: upsertError } = await supabase
    .from('settings')
    .upsert({ user_id: user.id, active_workspace_id: activeWorkspaceId }, { onConflict: 'user_id' });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
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
