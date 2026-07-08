import crypto from 'crypto';
import { getAdminClient } from '@/lib/supabase/admin';

// Same atomic-claim pattern as lib/ai.ts's claimNotificationSlot, but keyed per
// (user, error signature) instead of per user — a lead-scraping failure and a chat
// failure are different problems and shouldn't share one throttle slot, and a user
// hammering the same broken flow shouldn't get a notification per attempt.
async function claimAppErrorSlot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string,
  signature: string,
  windowMs: number,
): Promise<boolean> {
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - windowMs).toISOString();

  const { data: updated } = await admin
    .from('app_error_notifications')
    .update({ last_notified_at: now })
    .eq('user_id', userId)
    .eq('error_signature', signature)
    .lt('last_notified_at', cutoff)
    .select('user_id');
  if (updated && updated.length > 0) return true;

  const { error: insertErr } = await admin
    .from('app_error_notifications')
    .insert({ user_id: userId, error_signature: signature, last_notified_at: now });
  return !insertErr;
}

export interface AppErrorReport {
  userId?: string;
  workspaceId?: string;
  /** Where the error originated, e.g. 'prospect/search', 'react-error-boundary', 'window.onerror' */
  source: string;
  title?: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  /** Throttle window per (user, error) signature. Defaults to 10 minutes. */
  windowMs?: number;
}

// Fire-and-forget: inserts a clickable "app_error" notification with the full detail
// (message, stack, context) preserved in error_detail JSONB, so the bell/notifications
// UI can show the exact cause instead of the generic "no results" empty state. Never
// throws — a failure to report an error must never mask or replace the original error.
export async function reportAppError(report: AppErrorReport): Promise<void> {
  if (!report.userId) return;
  try {
    const admin = getAdminClient();
    const signature = crypto
      .createHash('sha1')
      .update(`${report.source}:${report.message}`)
      .digest('hex')
      .slice(0, 16);

    const claimed = await claimAppErrorSlot(admin, report.userId, signature, report.windowMs ?? 10 * 60 * 1000);
    if (!claimed) return;

    let resolvedWorkspaceId = report.workspaceId;
    if (!resolvedWorkspaceId) {
      const { data: settingsRow } = await admin
        .from('settings')
        .select('workspace_id')
        .eq('user_id', report.userId)
        .maybeSingle();
      resolvedWorkspaceId = settingsRow?.workspace_id ?? undefined;
    }

    const now = new Date().toISOString();
    await admin.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: report.userId,
      workspace_id: resolvedWorkspaceId ?? null,
      type: 'app_error',
      title: report.title || 'Erreur application ⚠️',
      body: report.message.slice(0, 500),
      link: null,
      error_detail: {
        source: report.source,
        message: report.message,
        stack: report.stack ?? null,
        context: report.context ?? null,
        timestamp: now,
      },
      is_read: false,
      created_at: now,
      updated_at: now,
    });
  } catch {
    /* never throw — error reporting must not become a second point of failure */
  }
}
