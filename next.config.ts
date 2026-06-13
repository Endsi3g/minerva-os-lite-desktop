import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    root: "./",
  },
  ...(process.env.EXPORT_MODE === 'true' ? {
    output: 'export',
    images: {
      unoptimized: true
    }
  } : {})
}

export default nextConfig
