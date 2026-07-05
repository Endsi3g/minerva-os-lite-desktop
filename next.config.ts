import type { NextConfig } from 'next';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

const isExportMode = process.env.EXPORT_MODE === 'true';

const nextConfig: NextConfig = {
  // maplibre-gl v5 uses a Web Worker internally; transpiling it ensures webpack
  // can bundle the worker blob correctly in production builds.
  transpilePackages: ['maplibre-gl'],

  // Turbopack only in dev/non-export mode — webpack handles generateStaticParams correctly in static export
  ...(isExportMode
    ? {
        output: 'export',
        images: { unoptimized: true },
      }
    : {
        turbopack: {
          root: path.resolve(process.cwd()),
        },
      }),
};

// Sentry's build-time source map upload assumes a server deployment (Vercel) — skip
// wrapping entirely for the Electron/Capacitor static export build (EXPORT_MODE=true).
export default isExportMode
  ? nextConfig
  : withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      widenClientFileUpload: true,
      disableLogger: true,
      // No SENTRY_AUTH_TOKEN configured yet → source map upload is skipped automatically,
      // error reporting itself still works via NEXT_PUBLIC_SENTRY_DSN.
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
    });
