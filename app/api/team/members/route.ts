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
      if (m.member_user_id) {
        const { data: profile } = await supabase
          .from('settings')
          .select('full_name, company_name')
          .eq('user_id', m.member_user_id)
          .maybeSingle();
        return { ...m, profile };
      }
      return { ...m, profile: null };
    })
  );

  return NextResponse.json({ members: enriched });
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
