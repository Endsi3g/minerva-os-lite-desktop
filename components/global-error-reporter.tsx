'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/report-client-error';

// Catches errors that never reach a React error boundary — thrown inside event
// handlers, timers, or unhandled promise rejections (e.g. a fetch() call whose
// .catch was forgotten). Sentry already records these via instrumentation-client.ts;
// this additionally surfaces them as a clickable notification in the app itself, so
// a user hitting a broken flow sees *something* actionable instead of nothing at all.
export function GlobalErrorReporter() {
  useEffect(() => {
    const isChunkError = (message: string) =>
      /Loading chunk [\w-]+ failed|ChunkLoadError|failed to fetch dynamically imported module/i.test(message);

    const onError = (event: ErrorEvent) => {
      const message = event.message || event.error?.message || 'Erreur inconnue';
      if (isChunkError(message)) return; // handled by ChunkErrorRecovery (auto-reload), not worth a notification
      reportClientError({
        source: 'window.onerror',
        message,
        stack: event.error?.stack,
        context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason || 'Promesse rejetée sans message');
      if (isChunkError(message)) return;
      reportClientError({
        source: 'unhandledrejection',
        message,
        stack: event.reason?.stack,
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
