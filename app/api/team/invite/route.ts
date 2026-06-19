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

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { email, role, workspaceOwnerId, expiresInDays = 3 } = body;

    if (!email || !role || !['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const ownerId = workspaceOwnerId || user.id;

    // 3. Verify the caller is the owner of THIS workspace, or an admin member of it.
    let isAuthorized = ownerId === user.id;
    if (!isAuthorized) {
      const { data: callerMembership } = await supabase
        .from('team_members')
        .select('role')
        .eq('workspace_owner_id', ownerId)
        .eq('member_user_id', user.id)
        .maybeSingle();
      isAuthorized = callerMembership?.role === 'admin';
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // 4. Retrieve the workspace ID
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', ownerId)
      .limit(1);
    const workspaceId = workspaces?.[0]?.id;
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // 5. Generate secure invite token and set expiration
    const adminClient = createServiceClient();
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (Number(expiresInDays) || 3));

    // Save to team_invites
    const { error: inviteErr } = await adminClient
      .from('team_invites')
      .insert({
        workspace_id: workspaceId,
        inviter_id: user.id,
        email: email.toLowerCase(),
        role,
        token,
        expires_at: expiresAt.toISOString()
      });

    if (inviteErr) {
      console.error('Error creating team invite:', inviteErr);
      return NextResponse.json({ error: 'Failed to create team invitation' }, { status: 500 });
    }

    // 6. Look up existing auth user to pre-fill member_user_id if they already exist
    let existingUserId: string | null = null;
    try {
      const { data: listData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = (listData?.users ?? []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (found?.id) existingUserId = found.id;
    } catch (lookupErr) {
      console.warn('Could not look up existing user ID:', lookupErr);
    }

    // 7. Insert/update team_members as pending (always pending until accepted!)
    const { data: existingMember } = await adminClient
      .from('team_members')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingMember) {
      if (existingMember.status === 'active') {
        return NextResponse.json({ error: 'This email is already a member' }, { status: 409 });
      }
      await adminClient
        .from('team_members')
        .update({
          role,
          member_user_id: existingUserId,
          invited_by: user.id,
          invited_at: new Date().toISOString()
        })
        .eq('id', existingMember.id);
    } else {
      await adminClient
        .from('team_members')
        .insert({
          workspace_owner_id: ownerId,
          member_user_id: existingUserId,
          email: email.toLowerCase(),
          role,
          status: 'pending',
          invited_by: user.id,
          workspace_id: workspaceId,
          plan: 'Business',
          usage_count: 0
        });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${token}`;

    // Send invitation email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const emailHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e6e5e0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #26251e; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px; font-family: Outfit, sans-serif;">Rejoignez Minerva OS Lite</h2>
          <p style="color: #555552; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Vous avez été invité(e) par <strong>${user.email}</strong> à rejoindre son espace de travail sur <strong>Minerva OS Lite</strong> en tant que <strong>${role}</strong>.
          </p>
          <div style="margin: 28px 0; text-align: left;">
            <a href="${inviteLink}" style="background-color: #10b981; color: #ffffff; padding: 10px 20px; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 13px; display: inline-block; transition: background-color 0.2s;">
              Accepter l'invitation
            </a>
          </div>
          <p style="color: #807d72; font-size: 11px; line-height: 1.5; border-top: 1px solid #e6e5e0; padding-top: 16px; margin-top: 24px;">
            Si le bouton ci-dessus ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :<br/>
            <span style="color: #10b981; word-break: break-all;">${inviteLink}</span>
          </p>
        </div>
      `;

      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Minerva OS <onboarding@resend.dev>',
            to: [email.toLowerCase()],
            subject: `Invitation à rejoindre Minerva OS`,
            html: emailHtml
          })
        });

        if (!resendRes.ok) {
          const errData = await resendRes.json();
          console.error('Failed to send email via Resend:', errData);
        } else {
          console.log('Email successfully sent via Resend to:', email);
        }
      } catch (sendErr) {
        console.error('Error sending email via Resend:', sendErr);
      }
    } else {
      console.warn('RESEND_API_KEY is not set. Email dispatch skipped.');
    }

    return NextResponse.json({ success: true, inviteLink }, { status: 201 });
  } catch (err) {
    console.error('Invite route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
