import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function createServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Unauthorized — please log in first' }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const adminClient = createServiceClient();

    // Find the pending invite row by token
    const { data: invite, error: findError } = await adminClient
      .from('team_members')
      .select('id, workspace_owner_id, role, status')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .maybeSingle();

    if (findError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invitation link' }, { status: 404 });
    }

    if (invite.workspace_owner_id === user.id) {
      return NextResponse.json({ error: 'You cannot accept your own invitation' }, { status: 400 });
    }

    // Accept: update row with real user info
    const { error: updateError } = await adminClient
      .from('team_members')
      .update({
        member_user_id: user.id,
        email: user.email!.toLowerCase(),
        status: 'active',
        joined_at: new Date().toISOString(),
        invite_token: null,
      })
      .eq('id', invite.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      role: invite.role,
      workspaceOwnerId: invite.workspace_owner_id,
    });
  } catch (err) {
    console.error('[accept-link]', err);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}
