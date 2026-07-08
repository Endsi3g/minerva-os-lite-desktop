import { getApiUrl } from '@/lib/api-helper';

const recentlySent = new Set<string>();

export interface ClientErrorReport {
  source: string;
  title?: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

// Fire-and-forget POST to /api/notifications/error. De-duplicates identical
// (source, message) pairs within the same page session so a render loop or a
// repeated unhandledrejection can't spam the network — the server also throttles
// per-signature, this just avoids pointless requests.
export function reportClientError(report: ClientErrorReport): void {
  try {
    const key = `${report.source}:${report.message}`;
    if (recentlySent.has(key)) return;
    recentlySent.add(key);
    setTimeout(() => recentlySent.delete(key), 60_000);

    fetch(getApiUrl('/api/notifications/error'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never throw from an error reporter */
  }
}
