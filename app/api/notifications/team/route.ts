// POST /api/notifications/team
// Fan out a notification to every active member of a workspace (owner + members),
// excluding the sender. Uses the service role to bypass RLS (a member cannot insert
// a notification row owned by another user otherwise).

import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, workspaceOwnerId, title, body, type, link, recipientUserIds } = await request.json();
    if (!workspaceOwnerId || !title) {
      return NextResponse.json({ error: 'workspaceOwnerId and title are required' }, { status: 400 });
    }

    const admin = getAdminClient();

    // Verify the caller belongs to this workspace (owner or active member)
    let allowed = workspaceOwnerId === user.id;
    if (!allowed) {
      const { data: membership } = await admin
        .from('team_members')
        .select('id')
        .eq('workspace_owner_id', workspaceOwnerId)
        .eq('member_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      allowed = !!membership;
    }
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const recipientIds = new Set<string>();

    if (Array.isArray(recipientUserIds) && recipientUserIds.length > 0) {
      // Targeted recipients (e.g. @mentions) — only notify these users
      recipientUserIds.forEach((id: string) => { if (id) recipientIds.add(id); });
    } else {
      // Broadcast: workspace owner + all active members with a user id
      const { data: members } = await admin
        .from('team_members')
        .select('member_user_id')
        .eq('workspace_owner_id', workspaceOwnerId)
        .eq('status', 'active');
      recipientIds.add(workspaceOwnerId);
      (members || []).forEach((m: { member_user_id: string | null }) => {
        if (m.member_user_id) recipientIds.add(m.member_user_id);
      });
    }
    // Don't notify the sender
    recipientIds.delete(user.id);

    if (recipientIds.size === 0) {
      return NextResponse.json({ success: true, delivered: 0 });
    }

    const nowStr = new Date().toISOString();
    const rows = Array.from(recipientIds).map((uid) => ({
      user_id: uid,
      workspace_id: workspaceId ?? null,
      type: type || 'team',
      title,
      body: body || '',
      link: link ?? null,
      is_read: false,
      created_at: nowStr,
      updated_at: nowStr,
    }));

    const { error: insertError } = await admin.from('notifications').insert(rows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, delivered: rows.length });
  } catch (err) {
    console.error('[notifications/team]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
