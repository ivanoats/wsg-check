import { test, expect, devices } from '@playwright/test'

/**
 * Mobile-emulation tests — demonstrates Playwright's built-in device presets
 * and manual viewport/user-agent overrides.
 *
 * Device presets (from `@playwright/test`'s `devices` map) set:
 *   - viewport width & height
 *   - device pixel ratio (DPR)
 *   - user-agent string
 *   - touch support
 *   - default browser scale
 *
 * These tests run in the 'Desktop Chrome' project and explicitly override
 * context/page options so the emulation behaviour is visible in one file.
 * The `playwright.config.ts` `projects` array also runs the full suite
 * against real mobile presets (Pixel 5, iPhone 13, iPad Pro).
 */

test.describe('Mobile emulation – manual overrides', () => {
  test('emulates a narrow mobile viewport (320 × 568, iPhone SE)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) ' +
        'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    })
    try {
      const page = await context.newPage()

      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      // The layout must not overflow horizontally on narrow viewports.
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      expect(bodyWidth).toBeLessThanOrEqual(320)

      await page.screenshot({ path: 'test-results/mobile-320-portrait.png', fullPage: true })
    } finally {
      await context.close()
    }
  })

  test('emulates a tablet viewport (768 × 1024, iPad)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: true,
    })
    try {
      const page = await context.newPage()

      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      await page.screenshot({ path: 'test-results/tablet-768.png', fullPage: true })
    } finally {
      await context.close()
    }
  })

  test('emulates a desktop landscape viewport (1440 × 900)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    try {
      const page = await context.newPage()

      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      await page.screenshot({ path: 'test-results/desktop-1440.png', fullPage: true })
    } finally {
      await context.close()
    }
  })
})

test.describe('Mobile emulation – device presets', () => {
  test('uses Pixel 5 device preset', async ({ browser }) => {
    const pixel5 = devices['Pixel 5']
    const context = await browser.newContext({ ...pixel5 })
    try {
      const page = await context.newPage()

      // Confirm viewport dimensions match the preset.
      expect(page.viewportSize()).toMatchObject({
        width: pixel5.viewport.width,
        height: pixel5.viewport.height,
      })

      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.screenshot({ path: 'test-results/pixel5-preset.png', fullPage: true })
    } finally {
      await context.close()
    }
  })

  test('uses iPhone 13 device preset', async ({ browser }) => {
    const iphone13 = devices['iPhone 13']
    const context = await browser.newContext({ ...iphone13 })
    try {
      const page = await context.newPage()

      expect(page.viewportSize()).toMatchObject({
        width: iphone13.viewport.width,
        height: iphone13.viewport.height,
      })

      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.screenshot({ path: 'test-results/iphone13-preset.png', fullPage: true })
    } finally {
      await context.close()
    }
  })

  test('uses Galaxy S9+ device preset', async ({ browser }) => {
    const galaxyS9 = devices['Galaxy S9+']
    const context = await browser.newContext({ ...galaxyS9 })
    try {
      const page = await context.newPage()

      expect(page.viewportSize()).toMatchObject({
        width: galaxyS9.viewport.width,
        height: galaxyS9.viewport.height,
      })

      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.screenshot({ path: 'test-results/galaxy-s9plus-preset.png', fullPage: true })
    } finally {
      await context.close()
    }
  })
})

test.describe('Mobile emulation – landscape orientation', () => {
  test('rotates Pixel 5 to landscape', async ({ browser }) => {
    const pixel5 = devices['Pixel 5']
    const context = await browser.newContext({
      ...pixel5,
      // Swap width/height to simulate landscape rotation.
      viewport: { width: pixel5.viewport.height, height: pixel5.viewport.width },
    })
    try {
      const page = await context.newPage()

      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.screenshot({ path: 'test-results/pixel5-landscape.png', fullPage: true })
    } finally {
      await context.close()
    }
  })
})
