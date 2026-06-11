import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

  const { memberId, role } = await request.json();

  if (!memberId || !role || !['admin', 'editor', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  // Only workspace owner can change roles
  const { data: member } = await supabase
    .from('team_members')
    .select('workspace_owner_id')
    .eq('id', memberId)
    .single();

  if (!member || member.workspace_owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden — only the workspace owner can change roles' }, { status: 403 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('team_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, member: updated });
}
