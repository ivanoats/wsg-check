import { defineConfig } from 'tsup'

export default defineConfig({
  // Two self-contained bundles: dist/cli/index.js (wsg-check) and
  // dist/mcp/index.js (wsg-check-mcp). Runtime dependencies stay external.
  entry: {
    'cli/index': 'src/cli/index.ts',
    'mcp/index': 'src/mcp/index.ts',
  },
  outDir: 'dist',
  format: ['esm'],
  target: 'node22',
  bundle: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
})
