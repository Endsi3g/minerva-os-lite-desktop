import * as Sentry from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tag — shows up in Sentry dashboard filters
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

  // Integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],

  // Tracing: 100% in dev, 10% in production
  tracesSampleRate: isDev ? 1.0 : 0.1,

  // Distributed tracing targets
  tracePropagationTargets: ['localhost', /^https:\/\/minerva-os-lite-desktop\.vercel\.app\/api/],

  // Session Replay: 100% of all sessions (good for early-stage)
  replaysSessionSampleRate: 1.0,
  // Also capture 100% of sessions where an error occurs
  replaysOnErrorSampleRate: 1.0,

  // Enable Sentry Logs API (Sentry.logger.info / .warn / .error)
  enableLogs: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
