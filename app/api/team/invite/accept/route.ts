import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the current logged-in user who is accepting the invite
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
      return NextResponse.json({ error: "Non authentifié. Connectez-vous d'abord." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { token } = body;
    if (!token) {
      return NextResponse.json({ error: 'Token requis' }, { status: 400 });
    }

    // 2. Validate the invitation using the admin client to bypass any reading RLS
    const adminClient = createServiceClient();

    const { data: invite, error: inviteErr } = await adminClient
      .from('team_invites')
      .select(`
        *,
        workspaces (
          name,
          owner_id
        )
      `)
      .eq('token', token)
      .maybeSingle();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: 'Invitation introuvable ou invalide' }, { status: 404 });
    }

    if (invite.accepted_at) {
      return NextResponse.json({ error: 'Cette invitation a déjà été acceptée' }, { status: 400 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Cette invitation a expiré' }, { status: 400 });
    }

    const workspaceName = (invite.workspaces as any)?.name || 'Espace collaboratif';
    const workspaceOwnerId = (invite.workspaces as any)?.owner_id;

    // 3. Mark invitation as accepted
    const nowIso = new Date().toISOString();
    await adminClient
      .from('team_invites')
      .update({ accepted_at: nowIso })
      .eq('id', invite.id);

    // 4. Insert or update the user in team_members as active
    // Try to find if they already have a row
    const { data: existingMember } = await adminClient
      .from('team_members')
      .select('id')
      .eq('workspace_id', invite.workspace_id)
      .eq('email', user.email?.toLowerCase())
      .maybeSingle();

    if (existingMember) {
      await adminClient
        .from('team_members')
        .update({
          member_user_id: user.id,
          status: 'active',
          joined_at: nowIso,
          role: invite.role
        })
        .eq('id', existingMember.id);
    } else {
      await adminClient
        .from('team_members')
        .insert({
          workspace_owner_id: workspaceOwnerId,
          member_user_id: user.id,
          email: user.email?.toLowerCase(),
          role: invite.role,
          status: 'active',
          invited_by: invite.inviter_id,
          workspace_id: invite.workspace_id,
          joined_at: nowIso,
          plan: 'Business',
          usage_count: 0
        });
    }

    // 5. Update user's settings profile to bypass onboarding
    const { data: settings } = await adminClient
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settings) {
      // Keep existing settings but make sure company_name is set to workspaceName if it's currently empty
      await adminClient
        .from('settings')
        .update({
          company_name: settings.company_name || workspaceName,
          full_name: settings.full_name || user.email?.split('@')[0] || 'Utilisateur',
          updated_at: nowIso
        })
        .eq('user_id', user.id);
    } else {
      // Insert settings if missing
      await adminClient
        .from('settings')
        .insert({
          user_id: user.id,
          company_name: workspaceName,
          full_name: user.email?.split('@')[0] || 'Utilisateur',
          email: user.email,
          timezone: 'Europe/Paris',
          niches: [],
          cities: [],
          created_at: nowIso,
          updated_at: nowIso
        });
    }

    return NextResponse.json({ success: true, workspaceName });
  } catch (err: any) {
    console.error('[accept-invite] error:', err);
    return NextResponse.json({ error: "Erreur lors de l'acceptation de l'invitation" }, { status: 500 });
  }
}
