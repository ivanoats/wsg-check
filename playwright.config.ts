import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for visual testing (screenshots) and mobile emulation.
 *
 * Run locally:
 *   npx playwright test          – run all e2e tests
 *   npx playwright test --ui     – interactive UI mode
 *   npx playwright show-report   – view HTML report after a run
 *
 * The tests target a live dev server (started automatically via `webServer`).
 * Screenshots are written to test-results/ (git-ignored).
 */
export default defineConfig({
  testDir: './tests/e2e',

  /** Fail fast on CI; keep going locally so you can see all failures. */
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [['html', { open: 'never' }], ['list']],

  /** Shared settings for every test. */
  use: {
    /** Base URL for page.goto('/') calls. */
    baseURL: 'http://localhost:3000',

    /** Capture screenshot on failure automatically. */
    screenshot: 'only-on-failure',

    /** Record video on failure for easier debugging. */
    video: 'retain-on-failure',

    /** Include browser trace on first retry. */
    trace: 'on-first-retry',
  },

  projects: [
    // ── Desktop ──────────────────────────────────────────────────────────
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Mobile ───────────────────────────────────────────────────────────
    {
      name: 'Mobile Chrome (Pixel 5)',
      use: { ...devices['Pixel 5'] },
    },
    {
      // Uses Chromium with iPhone 13 viewport/UA/touch emulation.
      // Install WebKit with `npx playwright install webkit` to run on real Safari.
      name: 'Mobile Safari (iPhone 13)',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
    {
      name: 'Tablet (iPad Pro)',
      use: { ...devices['iPad Pro'], browserName: 'chromium' },
    },
  ],

  /**
   * Start the Next.js dev server before the test suite and shut it down
   * afterwards.  Playwright waits until the URL is reachable before running
   * any tests.
   */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
