import { test, expect } from '@playwright/test'

/**
 * Screenshot tests — demonstrates Playwright's ability to capture full-page
 * and element-level screenshots for visual regression baseline creation.
 *
 * Screenshots are written to:
 *   test-results/          – artefacts and explicit manual snapshots
 */

test.describe('Screenshot capture', () => {
  test('captures a full-page screenshot of the home page', async ({ page }) => {
    await page.goto('/')

    // Wait for the main heading to confirm the page is fully rendered.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Explicit screenshot written to test-results/ for manual inspection.
    await page.screenshot({
      path: 'test-results/homepage-full.png',
      fullPage: true,
    })
  })

  test('captures a viewport screenshot of the home page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.screenshot({ path: 'test-results/homepage-viewport.png' })
  })

  test('captures a screenshot of the URL input form element', async ({ page }) => {
    await page.goto('/')

    const form = page.locator('form').first()
    await expect(form).toBeVisible()

    await form.screenshot({ path: 'test-results/url-input-form.png' })
  })

  test('captures a screenshot on dark-color-scheme preference', async ({ page }) => {
    // Emulate the user's OS dark-mode preference.
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.screenshot({
      path: 'test-results/homepage-dark.png',
      fullPage: true,
    })
  })
})
