import { createClient } from '@/lib/supabase/server';

export const SCOPE_PACKS = {
  identity: [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ],
  communication: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.freebusy',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
    'https://www.googleapis.com/auth/contacts.readonly',
  ],
  documents: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ]
};

export interface GoogleAuthStatus {
  connected: boolean;
  email?: string;
  scopes: string[];
  status?: string;
}

export async function getAuthStatus(supabase: any, userId: string): Promise<GoogleAuthStatus> {
  const { data: account } = await supabase
    .from('google_accounts')
    .select('id, google_email, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (!account) {
    return { connected: false, scopes: [] };
  }

  const { data: grants } = await supabase
    .from('google_scope_grants')
    .select('scope')
    .eq('account_id', account.id);

  const scopes = (grants || []).map((g: any) => g.scope);

  return {
    connected: account.status === 'connected',
    email: account.google_email,
    scopes,
    status: account.status
  };
}

export function getAuthorizationUrl(redirectUri: string, userId: string, redirectPath: string, targetPack: 'identity' | 'communication' | 'documents', existingScopes: string[] = []) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }

  const targetScopes = SCOPE_PACKS[targetPack];
  const combined = Array.from(new Set([...SCOPE_PACKS.identity, ...existingScopes, ...targetScopes]));
  const scopeParam = combined.join(' ');

  const state = JSON.stringify({ userId, redirectPath, pack: targetPack });

  let url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopeParam)}` +
    `&access_type=offline` +
    `&state=${encodeURIComponent(state)}`;

  if (existingScopes.length > 0) {
    url += `&include_granted_scopes=true`;
  } else {
    url += `&prompt=consent`;
  }

  return url;
}

export async function exchangeCodeForTokens(supabase: any, code: string, redirectUri: string, userId: string, pack: 'identity' | 'communication' | 'documents', workspaceId?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google client credentials are not configured');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`Token exchange failed: ${JSON.stringify(tokens)}`);
  }

  const { access_token, refresh_token, expires_in, scope } = tokens;
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` }
  });

  let googleEmail = '';
  if (profileResponse.ok) {
    const profile = await profileResponse.json();
    googleEmail = profile.email || '';
  }

  if (!googleEmail) {
    throw new Error('Failed to retrieve Google profile email');
  }

  const { data: existingAccount } = await supabase
    .from('google_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('google_email', googleEmail)
    .maybeSingle();

  let accountId: string;

  if (existingAccount) {
    accountId = existingAccount.id;
    await supabase
      .from('google_accounts')
      .update({ status: 'connected', updated_at: new Date().toISOString() })
      .eq('id', accountId);
  } else {
    const { data: newAccount, error: accError } = await supabase
      .from('google_accounts')
      .insert({
        user_id: userId,
        workspace_id: workspaceId || null,
        google_email: googleEmail,
        status: 'connected'
      })
      .select('id')
      .single();

    if (accError || !newAccount) {
      throw new Error(`Failed to create google_account: ${accError?.message}`);
    }
    accountId = newAccount.id;
  }

  const tokenData: any = {
    account_id: accountId,
    user_id: userId,
    access_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString()
  };

  if (refresh_token) {
    tokenData.refresh_token = refresh_token;
  }

  const { error: tokenError } = await supabase
    .from('google_tokens')
    .upsert(tokenData);

  if (tokenError) {
    throw new Error(`Failed to save tokens: ${tokenError.message}`);
  }

  const grantedScopes = (scope || '').split(' ').filter(Boolean);
  if (grantedScopes.length > 0) {
    await supabase
      .from('google_scope_grants')
      .delete()
      .eq('account_id', accountId);

    const grants = grantedScopes.map((sc: string) => ({
      account_id: accountId,
      user_id: userId,
      scope: sc
    }));

    await supabase.from('google_scope_grants').insert(grants);
  }

  await supabase
    .from('settings')
    .upsert({
      user_id: userId,
      google_access_token: access_token,
      google_refresh_token: refresh_token || undefined,
      google_token_expires_at: expiresAt,
      google_email: googleEmail,
      updated_at: new Date().toISOString()
    });

  return { accountId, googleEmail };
}

export async function getFreshAccessToken(supabase: any, userId: string): Promise<string> {
  const { data: account } = await supabase
    .from('google_accounts')
    .select('id, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (!account) {
    throw new Error('Google integration not connected');
  }

  const { data: tokens } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('account_id', account.id)
    .maybeSingle();

  if (!tokens) {
    throw new Error('Google tokens not found');
  }

  const now = new Date();
  const expiresAt = new Date(tokens.expires_at);

  if (expiresAt.getTime() - now.getTime() > 60000) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) {
    throw new Error('Refresh token missing, re-authorization required');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google client credentials are not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token'
    })
  });

  const refreshed = await response.json();
  if (!response.ok) {
    await supabase
      .from('google_accounts')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', account.id);

    throw new Error(`Failed to refresh Google token: ${JSON.stringify(refreshed)}`);
  }

  const newAccessToken = refreshed.access_token;
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await supabase
    .from('google_tokens')
    .update({
      access_token: newAccessToken,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString()
    })
    .eq('account_id', account.id);

  await supabase
    .from('settings')
    .update({
      google_access_token: newAccessToken,
      google_token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  return newAccessToken;
}

export async function disconnectGoogle(supabase: any, userId: string) {
  const { data: account } = await supabase
    .from('google_accounts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!account) return;

  try {
    const { data: tokenRecord } = await supabase
      .from('google_tokens')
      .select('access_token, refresh_token')
      .eq('account_id', account.id)
      .maybeSingle();

    const token = tokenRecord?.refresh_token || tokenRecord?.access_token;
    if (token) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    }
  } catch (err) {
    console.error('[revoke token error]', err);
  }

  await supabase
    .from('google_accounts')
    .delete()
    .eq('id', account.id);

  await supabase
    .from('settings')
    .update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expires_at: null,
      google_email: null,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
}
