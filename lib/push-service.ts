// Native mobile push (FCM HTTP v1) — sends to Capacitor iOS/Android device tokens stored
// in `device_push_tokens`. Mirrors lib/email-service.ts's graceful no-op-if-unconfigured
// pattern: without FIREBASE_SERVICE_ACCOUNT_JSON set, calls log and return { ok: false }
// instead of throwing, so the rest of the app (in-app notifications, DB inserts) keeps
// working even before a Firebase project is wired up.
import crypto from 'crypto';
import { getAdminClient } from '@/lib/supabase/admin';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function base64url(input: Buffer | string): string {
  return Buffer.from(input as any)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    console.error('[push] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
    return null;
  }
}

async function getAccessToken(account: ServiceAccount): Promise<string | null> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: account.client_email,
    scope: FCM_SCOPE,
    aud: TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,
  }));
  const signingInput = `${header}.${claim}`;
  const signature = base64url(
    crypto.createSign('RSA-SHA256').update(signingInput).sign(account.private_key)
  );
  const assertion = `${signingInput}.${signature}`;

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    if (!res.ok) {
      console.error('[push] Failed to obtain FCM access token:', await res.text());
      return null;
    }
    const data = await res.json();
    cachedAccessToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
    return cachedAccessToken.token;
  } catch (err) {
    console.error('[push] Network error obtaining FCM access token:', err);
    return null;
  }
}

export interface SendPushOptions {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface SendPushResult {
  ok: boolean;
  sent: number;
  error?: string;
}

// Sends a native push to every device registered for this user. Best-effort: prunes
// tokens FCM reports as unregistered/invalid, but never throws — a push failure must
// never block the caller's own DB-backed in-app notification.
export async function sendPushToUser(userId: string, opts: SendPushOptions): Promise<SendPushResult> {
  const account = getServiceAccount();
  if (!account) {
    console.info('[push] FIREBASE_SERVICE_ACCOUNT_JSON not set — skipping native push:', opts.title);
    return { ok: false, sent: 0, error: 'FIREBASE_SERVICE_ACCOUNT_JSON not configured' };
  }

  const admin = getAdminClient();
  const { data: devices } = await admin
    .from('device_push_tokens')
    .select('id, token')
    .eq('user_id', userId);

  if (!devices || devices.length === 0) {
    return { ok: true, sent: 0 };
  }

  const accessToken = await getAccessToken(account);
  if (!accessToken) {
    return { ok: false, sent: 0, error: 'Could not obtain FCM access token' };
  }

  let sent = 0;
  const staleIds: string[] = [];

  await Promise.all(devices.map(async (device: { id: string; token: string }) => {
    try {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: device.token,
              notification: { title: opts.title, body: opts.body },
              data: opts.data,
            },
          }),
        }
      );
      if (res.ok) {
        sent++;
      } else {
        const errBody = await res.json().catch(() => ({}));
        const status = errBody?.error?.status;
        if (status === 'NOT_FOUND' || status === 'UNREGISTERED' || status === 'INVALID_ARGUMENT') {
          staleIds.push(device.id);
        } else {
          console.error('[push] FCM send failed:', errBody);
        }
      }
    } catch (err) {
      console.error('[push] Network error sending to device:', err);
    }
  }));

  if (staleIds.length > 0) {
    await admin.from('device_push_tokens').delete().in('id', staleIds).then(() => {}, () => {});
  }

  return { ok: sent > 0, sent };
}
