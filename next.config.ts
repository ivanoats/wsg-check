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
   * Performance budget (WSG 9.4 — Sustainability of the Tool Itself).
   * Turbopack does not support webpack's `performance.hints` config.
   * The 500 KB initial-load script budget is enforced via Lighthouse CI:
   * see the `resource-summary:script:size` assertion in .lighthouserc.json.
   */
}

export default nextConfig
