import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Token requis' }, { status: 400 });
    }

    const supabase = await createClient();

    // Query team_invites and join with workspaces
    const { data: invite, error: inviteErr } = await supabase
      .from('team_invites')
      .select(`
        id,
        email,
        role,
        expires_at,
        accepted_at,
        workspace_id,
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

    // Get inviter profile name
    const ownerId = (invite.workspaces as any)?.owner_id;
    let inviterName = 'Un administrateur';
    if (ownerId) {
      const { data: profile } = await supabase
        .from('settings')
        .select('full_name')
        .eq('user_id', ownerId)
        .maybeSingle();
      if (profile?.full_name) {
        inviterName = profile.full_name;
      }
    }

    return NextResponse.json({
      valid: true,
      email: invite.email,
      role: invite.role,
      workspaceName: (invite.workspaces as any)?.name || 'Espace collaboratif',
      inviterName,
    });
  } catch (err: any) {
    console.error('[validate-invite] error:', err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
