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
