import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/google/google-auth-service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const stateVal = searchParams.get('state') || '';
  const error = searchParams.get('error');

  let userId = '';
  let redirectPath = '/integrations';
  let pack: 'identity' | 'communication' | 'documents' = 'identity';

  try {
    if (stateVal) {
      const parsed = JSON.parse(stateVal);
      userId = parsed.userId || '';
      redirectPath = parsed.redirectPath || '/integrations';
      pack = parsed.pack || 'identity';
    }
  } catch (err) {
    console.error('[OAuth callback state parsing error]', err);
  }

  const redirectTarget = `${new URL(req.url).origin}${redirectPath}${redirectPath.includes('?') ? '&' : '?'}success=`;

  if (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(`${redirectTarget}error_auth`);
  }

  if (!code || !userId) {
    console.error('Missing code or state params');
    return NextResponse.redirect(`${redirectTarget}error_params`);
  }

  try {
    const supabase = await createClient();

    // Fetch user workspace
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);
    
    const workspaceId = workspaces?.[0]?.id;

    const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || new URL(req.url).origin;
    const redirectUri = `${origin}/api/google/auth/callback`;
    await exchangeCodeForTokens(supabase, code, redirectUri, userId, pack, workspaceId);

    return NextResponse.redirect(`${redirectTarget}google_connected`);
  } catch (err: any) {
    console.error('Error in OAuth callback:', err);
    return NextResponse.redirect(`${redirectTarget}error_exchange`);
  }
}
