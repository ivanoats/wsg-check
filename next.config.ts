import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * Image optimisation: serve WebP/AVIF formats automatically via next/image.
   * Browsers that support AVIF get the smallest file; others fall back to WebP.
   * WSG 2.11 — use optimised, modern image formats to reduce payload size.
   */
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  /**
   * Enforce a 500 KB initial-load performance budget in production client
   * builds (WSG 9.4 — Sustainability of the Tool Itself).
   * Emits a build warning rather than an error so CI is not blocked on a
   * single over-budget chunk, but the warning is visible in build output and
   * can be used to track regressions.
   */
  webpack: (config, { isServer, dev }) => {
    if (!dev && !isServer) {
      config.performance = {
        hints: 'warning',
        maxAssetSize: 500_000,
        maxEntrypointSize: 500_000,
      }
    }
    return config
  },
}

export default nextConfig
