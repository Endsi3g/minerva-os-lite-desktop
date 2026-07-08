'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { reportClientError } from '@/lib/report-client-error';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    reportClientError({
      source: 'global-error',
      title: 'Erreur critique de l\'application',
      message: error.message || String(error),
      stack: error.stack,
      context: error.digest ? { digest: error.digest } : undefined,
    });
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: '#fafaf8', color: '#26251e', padding: '24px', textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Une erreur inattendue est survenue</h1>
          <p style={{ fontSize: '13px', color: '#7a7a76', maxWidth: '420px' }}>
            L&apos;équipe a été notifiée automatiquement. Vous pouvez réessayer ou recharger la page.
          </p>
          <button
            onClick={() => reset()}
            style={{
              height: '36px', padding: '0 16px', borderRadius: '8px', border: 'none',
              background: '#059669', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
