'use client';

import * as Sentry from '@sentry/nextjs';

/**
 * Temporary dev-only page to verify Sentry end-to-end.
 * Visit http://localhost:3000/sentry-test while running `pnpm dev`.
 *
 * What to check in the Sentry dashboard after clicking:
 *  - Issues → new error "This is your first error!" with full stack trace
 *  - Logs → "User triggered test error" info log entry
 *  - Performance → a test_counter metric event
 *
 * Remove this page once you've confirmed everything works.
 */

function ErrorButton() {
  return (
    <button
      id="sentry-test-error-btn"
      onClick={() => {
        // Send a log before throwing the error
        Sentry.logger.info('User triggered test error', {
          action: 'test_error_button_click',
        });
        // Send a test metric before throwing the error
        Sentry.metrics.count('test_counter', 1);
        throw new Error('This is your first error!');
      }}
      style={{
        padding: '12px 24px',
        background: '#e11d48',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        cursor: 'pointer',
        fontFamily: 'monospace',
      }}
    >
      💥 Break the world (test Sentry)
    </button>
  );
}

export default function SentryTestPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h1>Not available in production.</h1>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        fontFamily: 'sans-serif',
        background: '#0f0f0f',
        color: '#f5f5f5',
      }}
    >
      <h1 style={{ fontSize: 28, margin: 0 }}>🛡 Sentry Verification Page</h1>
      <p style={{ color: '#aaa', margin: 0, maxWidth: 480, textAlign: 'center' }}>
        Click the button below. If everything is configured correctly, you&apos;ll see a new error,
        a log entry, and a metric appear in your{' '}
        <a
          href="https://sentry.io"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#e11d48' }}
        >
          Sentry dashboard
        </a>{' '}
        within a few seconds.
      </p>
      <ErrorButton />
      <p style={{ color: '#555', fontSize: 13, margin: 0 }}>
        Delete <code>app/sentry-test/page.tsx</code> once verified.
      </p>
    </div>
  );
}
