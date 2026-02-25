import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/app/**', 'src/**/*.d.ts', 'src/**/index.ts', 'src/**/types.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Force Zag.js packages to resolve to the versions Ark UI ships (1.33.x)
      // to avoid a version mismatch with the top-level 0.62.x installs.
      '@zag-js/accordion': path.resolve(
        __dirname,
        './node_modules/@ark-ui/react/node_modules/@zag-js/accordion'
      ),
      '@zag-js/collapsible': path.resolve(
        __dirname,
        './node_modules/@ark-ui/react/node_modules/@zag-js/collapsible'
      ),
      'styled-system/css': path.resolve(__dirname, './styled-system/css'),
      'styled-system/jsx': path.resolve(__dirname, './styled-system/jsx'),
      'styled-system/patterns': path.resolve(__dirname, './styled-system/patterns'),
      'styled-system/recipes': path.resolve(__dirname, './styled-system/recipes'),
      'styled-system/tokens': path.resolve(__dirname, './styled-system/tokens'),
      'styled-system/types': path.resolve(__dirname, './styled-system/types'),
    },
  },
})
