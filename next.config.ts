import type { NextConfig } from 'next';

const isExportMode = process.env.EXPORT_MODE === 'true';

const nextConfig: NextConfig = {
  turbopack: {
    root: './',
  },
  ...(isExportMode
    ? {
        output: 'export',
        images: {
          unoptimized: true,
        },
      }
    : {}),
};

export default nextConfig;
