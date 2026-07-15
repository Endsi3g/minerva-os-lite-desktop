import { NextRequest, NextResponse } from 'next/server';

function createServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Public endpoint — no auth required. Returns safe invite preview info.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  try {
    const adminClient = createServiceClient();

    const { data: invite } = await adminClient
      .from('team_members')
      .select('role, workspace_owner_id, status, invited_by')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .maybeSingle();

    if (!invite) {
      return NextResponse.json({ error: 'Invitation introuvable ou déjà utilisée' }, { status: 404 });
    }

    // Get inviter info from settings
    let inviterName = 'Un membre';
    let workspaceName = 'Espace de travail';

    if (invite.workspace_owner_id) {
      const { data: ownerSettings } = await adminClient
        .from('settings')
        .select('full_name, company_name')
        .eq('user_id', invite.workspace_owner_id)
        .maybeSingle();

      if (ownerSettings?.full_name) inviterName = ownerSettings.full_name;
      if (ownerSettings?.company_name) workspaceName = ownerSettings.company_name;
    }

    return NextResponse.json({
      role: invite.role,
      inviterName,
      workspaceName,
      valid: true,
    });
  } catch (err) {
    console.error('[invite-preview]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
