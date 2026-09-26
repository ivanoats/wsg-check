import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    ignores: ['node_modules/**', '.next/**', 'styled-system/**', 'coverage/**', 'dist/**'],
  },
  {
    // The CLI (and later the MCP server) ship in the npm package without the
    // web app's dependencies, which are devDependencies. Keep the shared
    // layers free of Next.js, React, and the Next-based API helpers so tsup
    // never bundles them into dist/.
    files: [
      'src/cli/**',
      'src/mcp/**',
      'src/pipeline/**',
      'src/core/**',
      'src/checks/**',
      'src/report/**',
      'src/config/**',
      'src/utils/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'next',
                'next/*',
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                '@ark-ui/*',
                'rate-limiter-flexible',
                'styled-system/*',
                '@/app/*',
                '**/app/*',
                '@/api/cors',
                '@/api/rate-limit',
                '@/api/response',
                '**/api/cors',
                '**/api/rate-limit',
                '**/api/response',
              ],
              message:
                'Web-only module: the CLI and MCP server are published without the web app dependencies.',
            },
          ],
        },
      ],
    },
  },
  {
    // Node scripts run directly with `node` (not bundled or type-checked).
    files: ['tests/smoke/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
      },
    },
  },
  {
    // Service workers run in the browser's service-worker global scope.
    // Declare those globals so ESLint does not flag them as undefined.
    // `self` is intentionally omitted — use the standardised `globalThis` instead.
    files: ['public/sw.js'],
    languageOptions: {
      globals: {
        caches: 'readonly',
        clients: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        URL: 'readonly',
        location: 'readonly',
        addEventListener: 'readonly',
      },
    },
  }
)
