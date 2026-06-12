import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Creates a service-role Supabase client (bypasses RLS — server only!)
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
  }

  // Use the raw JS client for admin operations
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the calling user (must be authenticated)
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify the caller is admin or owner
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('workspace_owner_id', user.id)
      .eq('member_user_id', user.id)
      .maybeSingle();

    // The owner themselves can always invite — check if they are owner of the workspace
    // OR have admin role assigned
    const { data: callerMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('workspace_owner_id', user.id)
      .eq('member_user_id', user.id)
      .maybeSingle();

    const isOwner = !membership && !callerMember; // If no record, they ARE the owner
    const isAdmin = callerMember?.role === 'admin';

    if (!isOwner && !isAdmin) {
      // Check if they're an admin of someone else's workspace
      const { data: asAdmin } = await supabase
        .from('team_members')
        .select('role')
        .eq('member_user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!asAdmin) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // 3. Parse request body
    const { email, role, workspaceOwnerId } = await request.json();

    if (!email || !role || !['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const ownerId = workspaceOwnerId || user.id;

    // 4. Check if already invited
    const { data: existing } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('workspace_owner_id', ownerId)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `This email is already ${existing.status === 'active' ? 'a member' : 'pending invitation'}` },
        { status: 409 }
      );
    }

    // 5. Send Supabase invitation email (Service Role)
    const adminClient = createServiceClient();
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding`,
        data: {
          invited_by: user.id,
          workspace_owner_id: ownerId,
          role,
        },
      }
    );

    if (inviteError) {
      console.error('Supabase invite error:', inviteError);
      // If user already exists in Supabase Auth, still insert the team member record
      if (!inviteError.message.includes('already been registered')) {
        return NextResponse.json({ error: inviteError.message }, { status: 500 });
      }
    }

    // 6. Insert pending team member record
    const { data: member, error: insertError } = await supabase
      .from('team_members')
      .insert({
        workspace_owner_id: ownerId,
        member_user_id: inviteData?.user?.id ?? null,
        email: email.toLowerCase(),
        role,
        status: 'pending',
        invited_by: user.id,
        plan: 'Business',
        usage_count: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('DB insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save invitation' }, { status: 500 });
    }

    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (err) {
    console.error('Invite route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
