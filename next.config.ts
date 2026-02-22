import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Allow .js extension imports to resolve .ts/.tsx files.
    // Needed because src/checks/ and other ESM-compatible modules use
    // explicit .js extensions (required by Node.js ESM / the CLI), while
    // webpack would otherwise fail to locate the .ts source files.
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    },
  },
}

export default nextConfig
