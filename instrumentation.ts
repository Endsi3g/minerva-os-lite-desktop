import * as Sentry from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';

// Shared options for both Node.js and Edge runtimes
const sharedOptions: Parameters<typeof Sentry.init>[0] = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  // Tracing: 100% in dev, 10% in production
  tracesSampleRate: isDev ? 1.0 : 0.1,
  // Enable Sentry Logs API on the server too
  enableLogs: true,
};

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init(sharedOptions);
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(sharedOptions);
  }
}

export const onRequestError = Sentry.captureRequestError;
