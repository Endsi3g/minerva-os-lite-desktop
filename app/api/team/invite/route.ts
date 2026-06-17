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

    // 2. Parse request body — needed before authorization since the target
    // workspace (ownerId) determines who is allowed to invite into it.
    const { email, role, workspaceOwnerId } = await request.json();

    if (!email || !role || !['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const ownerId = workspaceOwnerId || user.id;

    // 3. Verify the caller is the owner of THIS workspace, or an admin member of it.
    // (Previously this checked a self-referential row that never exists, which made
    // the check pass for nearly any authenticated user regardless of `ownerId`.)
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

    // 5. Generate Supabase invitation link (Service Role)
    const adminClient = createServiceClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let actionLink = `${baseUrl}/login`;
    let inviteData: any = null;
    let inviteError: any = null;
    let existingUserId: string | null = null;

    try {
      const genResult = await adminClient.auth.admin.generateLink({
        type: 'invite',
        email: email.toLowerCase(),
        options: {
          redirectTo: `${baseUrl}/onboarding`,
          data: {
            invited_by: user.id,
            workspace_owner_id: ownerId,
            role,
          },
        }
      });
      inviteData = genResult.data;
      inviteError = genResult.error;
    } catch (e: any) {
      inviteError = e;
    }

    if (inviteError) {
      console.error('Supabase generateLink error:', inviteError);
      const alreadyRegistered =
        inviteError?.message?.includes('already been registered') ||
        inviteError?.message?.includes('already registered') ||
        inviteError?.code === 'email_exists';

      if (!alreadyRegistered) {
        return NextResponse.json({ error: inviteError.message }, { status: 500 });
      }

      // User already exists in Supabase Auth — look up their ID so we can
      // immediately activate the membership instead of leaving member_user_id null.
      try {
        const { data: listData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = (listData?.users ?? []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (found?.id) existingUserId = found.id;
      } catch (lookupErr) {
        console.warn('Could not look up existing user ID:', lookupErr);
      }

      actionLink = `${baseUrl}/login`;
    } else if (inviteData?.properties?.action_link) {
      actionLink = inviteData.properties.action_link;
    }

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
            <a href="${actionLink}" style="background-color: #10b981; color: #ffffff; padding: 10px 20px; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 13px; display: inline-block; transition: background-color 0.2s;">
              Accepter l'invitation
            </a>
          </div>
          <p style="color: #807d72; font-size: 11px; line-height: 1.5; border-top: 1px solid #e6e5e0; padding-top: 16px; margin-top: 24px;">
            Si le bouton ci-dessus ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :<br/>
            <span style="color: #10b981; word-break: break-all;">${actionLink}</span>
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

    // 6. Insert team member record
    const resolvedMemberId = existingUserId ?? inviteData?.user?.id ?? null;
    const resolvedStatus = resolvedMemberId ? 'active' : 'pending';

    const { data: member, error: insertError } = await supabase
      .from('team_members')
      .insert({
        workspace_owner_id: ownerId,
        member_user_id: resolvedMemberId,
        email: email.toLowerCase(),
        role,
        status: resolvedStatus,
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
