import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state');
  const error = searchParams.get('error');

  const redirectTarget = `${new URL(req.url).origin}/settings?success=`;

  if (error) {
    console.error("Google OAuth error callback:", error);
    return NextResponse.redirect(`${redirectTarget}error_auth`);
  }

  if (!code || !userId) {
    console.error("Missing code or userId state");
    return NextResponse.redirect(`${redirectTarget}error_params`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUri = `${new URL(req.url).origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret || clientId.includes('placeholder')) {
    console.error("Google OAuth credentials missing in environment variables");
    return NextResponse.redirect(`${redirectTarget}error_config`);
  }

  try {
    // 1. Exchange authorization code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Error exchanging code for tokens:", tokens);
      return NextResponse.redirect(`${redirectTarget}error_token_exchange`);
    }

    const { access_token, refresh_token, expires_in } = tokens;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // 2. Fetch Google User Profile email
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    let googleEmail = '';
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      googleEmail = profile.email || '';
    }

    // 3. Store tokens in Supabase Settings
    const supabase = await createClient();

    // Fetch existing settings first so we don't overwrite other fields on upsert
    const { data: currentSettings } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const upsertData: Record<string, string | string[] | number | boolean | null | undefined> = {
      user_id: userId,
      google_access_token: access_token,
      google_token_expires_at: expiresAt,
      updated_at: new Date().toISOString()
    };

    if (refresh_token) {
      upsertData.google_refresh_token = refresh_token;
    }
    if (googleEmail) {
      upsertData.google_email = googleEmail;
    }

    const { error: dbError } = await supabase
      .from('settings')
      .upsert({
        ...currentSettings,
        ...upsertData
      });

    if (dbError) {
      console.error("Database error saving Google tokens:", dbError);
      return NextResponse.redirect(`${redirectTarget}error_db`);
    }

    return NextResponse.redirect(`${redirectTarget}google_connected`);
  } catch (err) {
    console.error("Error in OAuth callback route:", err);
    return NextResponse.redirect(`${redirectTarget}error_server`);
  }
}
