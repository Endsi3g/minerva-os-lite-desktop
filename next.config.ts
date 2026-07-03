import type { NextConfig } from 'next';
import path from 'path';

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

export default nextConfig;
