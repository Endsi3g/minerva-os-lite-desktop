import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const FB_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const error = searchParams.get('error');

  if (error || !code || !stateRaw) {
    return NextResponse.redirect(`${APP_URL}/ads?error=facebook_auth_failed`);
  }

  let workspaceId: string | undefined;
  try {
    const state = JSON.parse(Buffer.from(stateRaw, 'base64').toString());
    workspaceId = state.workspaceId;
  } catch {
    return NextResponse.redirect(`${APP_URL}/ads?error=invalid_state`);
  }

  const redirectUri = `${APP_URL}/api/ads/facebook/callback`;
  const tokenRes = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${FB_APP_SECRET}&code=${code}`
  );

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${APP_URL}/ads?error=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json();
  const shortToken = tokenData.access_token;

  // Exchange for long-lived token
  const longTokenRes = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${shortToken}`
  );
  const longTokenData = await longTokenRes.json();
  const accessToken = longTokenData.access_token || shortToken;

  const supabase = await createClient();
  await supabase.from('fb_connections').upsert({
    workspace_id: workspaceId,
    access_token: accessToken,
    status: 'active',
    connected_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id' });

  return NextResponse.redirect(`${APP_URL}/ads?fb=connected`);
}
