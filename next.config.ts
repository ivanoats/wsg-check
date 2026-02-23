import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow .js extension imports to resolve .ts/.tsx files.
  // Needed because src/checks/ and other ESM-compatible modules use
  // explicit .js extensions (required by Node.js ESM / the CLI).
  // `experimental.extensionAlias` applies to the webpack production build
  // (`next build`); `turbopack.extensionAlias` applies to the Turbopack
  // development server (`next dev`). Both must be set for consistent resolution
  // across build modes.
  experimental: {
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    },
  },
  turbopack: {
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    },
  },
}

export default nextConfig
