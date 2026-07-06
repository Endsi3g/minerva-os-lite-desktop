import { createClient } from '@/lib/supabase/server';

export const SCOPE_PACKS = {
  identity: [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ],
  communication: [
    'https://www.googleapis.com/auth/gmail.modify',
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
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!account) {
    // Fallback: legacy settings.google_* columns
    const { data: s } = await supabase
      .from('settings')
      .select('google_access_token, google_email, google_token_expires_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (s?.google_access_token && s?.google_email) {
      const exp = new Date(s.google_token_expires_at || 0).getTime();
      if (exp > Date.now() - 300_000) {
        return { connected: true, email: s.google_email, scopes: [] };
      }
    }
    return { connected: false, scopes: [] };
  }

  const { data: grants } = await supabase
    .from('google_scope_grants')
    .select('scope')
    .eq('account_id', account.id);

  const scopes = (grants || []).map((g: any) => g.scope);

  // If status is 'error', check tokens directly and auto-heal
  if (account.status !== 'connected') {
    const { data: tok } = await supabase
      .from('google_tokens')
      .select('access_token, expires_at, refresh_token')
      .eq('account_id', account.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tok?.access_token) {
      const exp = new Date(tok.expires_at).getTime();
      if (exp > Date.now() - 300_000 || tok.refresh_token) {
        // Auto-heal status to 'connected'
        await supabase
          .from('google_accounts')
          .update({ status: 'connected', updated_at: new Date().toISOString() })
          .eq('id', account.id);
        return { connected: true, email: account.google_email, scopes, status: 'connected' };
      }
    }
    return { connected: false, email: account.google_email, scopes, status: account.status };
  }

  return {
    connected: true,
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
    .upsert(tokenData, { onConflict: 'account_id' });

  if (tokenError) {
    // Fallback: try update then insert
    const { error: updateErr } = await supabase
      .from('google_tokens')
      .update(tokenData)
      .eq('account_id', accountId);
    if (updateErr) {
      await supabase.from('google_tokens').insert(tokenData);
    }
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
    .order('created_at', { ascending: false })
    .limit(1)
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

async function refreshLegacyToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth credentials missing');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to refresh token');
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  return { accessToken: data.access_token, expiresAt };
}

// Single source of truth for "does this user have a usable Gmail token, and what is it" —
// covers both the legacy settings.google_* store and the newer google_accounts/google_tokens
// store. Any route or cron job that needs to act on a user's Gmail account should go through
// this instead of querying one store directly, so a user connected via either flow is never
// silently skipped (this drifted apart once already: gmail-check-replies queried settings
// only, so newer-flow accounts never got their replies detected).
export async function resolveAccessToken(
  supabase: any,
  userId: string
): Promise<{ accessToken: string; googleEmail: string } | null> {
  const { data: settings } = await supabase
    .from('settings')
    .select('google_access_token, google_refresh_token, google_token_expires_at, google_email')
    .eq('user_id', userId)
    .maybeSingle();

  let accessToken: string | null = settings?.google_access_token ?? null;
  const googleEmail: string = settings?.google_email ?? '';

  // Path 1: legacy settings.google_refresh_token (old OAuth flow)
  if (settings?.google_refresh_token) {
    const needsRefresh = !accessToken ||
      (settings.google_token_expires_at &&
        new Date(settings.google_token_expires_at).getTime() - Date.now() < 300_000);

    if (needsRefresh) {
      try {
        const refreshed = await refreshLegacyToken(settings.google_refresh_token);
        accessToken = refreshed.accessToken;
        await supabase
          .from('settings')
          .update({ google_access_token: refreshed.accessToken, google_token_expires_at: refreshed.expiresAt })
          .eq('user_id', userId);
      } catch {
        // Legacy refresh failed — fall through to newer token path
        accessToken = null;
      }
    }

    if (accessToken) return { accessToken, googleEmail };
  }

  // Path 2: newer google_accounts / google_tokens tables (uses status check)
  try {
    const status = await getAuthStatus(supabase, userId);
    if (status.connected) {
      const freshToken = await getFreshAccessToken(supabase, userId);
      return { accessToken: freshToken, googleEmail: status.email || googleEmail };
    }
  } catch { /* fall through to path 3 */ }

  // Path 3: direct google_tokens query — bypasses status='error' so reconnect heals itself
  try {
    const { data: acct } = await supabase
      .from('google_accounts')
      .select('id, google_email')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (acct) {
      const { data: tok } = await supabase
        .from('google_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('account_id', acct.id)
        .maybeSingle();

      if (tok?.access_token) {
        const exp = new Date(tok.expires_at);
        if (exp.getTime() - Date.now() > 60000) {
          await supabase.from('google_accounts').update({ status: 'connected', updated_at: new Date().toISOString() }).eq('id', acct.id);
          return { accessToken: tok.access_token, googleEmail: acct.google_email || '' };
        }
        if (tok.refresh_token) {
          const refreshed = await refreshLegacyToken(tok.refresh_token);
          await supabase.from('google_tokens')
            .update({ access_token: refreshed.accessToken, expires_at: refreshed.expiresAt, updated_at: new Date().toISOString() })
            .eq('account_id', acct.id);
          await supabase.from('google_accounts').update({ status: 'connected', updated_at: new Date().toISOString() }).eq('id', acct.id);
          return { accessToken: refreshed.accessToken, googleEmail: acct.google_email || '' };
        }
      }
    }
  } catch { }

  return null;
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
