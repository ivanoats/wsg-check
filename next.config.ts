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
}

export default nextConfig
