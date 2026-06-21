import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, workspaceOwnerId } = await request.json();
    if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const ownerId = workspaceOwnerId || user.id;
    const token = randomBytes(32).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const adminClient = createServiceClient();
    const { error: insertError } = await adminClient.from('team_members').insert({
      workspace_owner_id: ownerId,
      email: `invite-link-${token.slice(0, 8)}@pending.minervaos`,
      role,
      status: 'pending',
      invite_token: token,
      invited_by: user.id,
      invited_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('[create-invite-link] insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const link = `${baseUrl}/join/${token}`;
    return NextResponse.json({ token, link, role });
  } catch (err) {
    console.error('[create-invite-link]', err);
    return NextResponse.json({ error: 'Failed to create invite link' }, { status: 500 });
  }
}
