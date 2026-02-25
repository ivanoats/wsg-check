/**
 * Integration tests — Full pipeline (URL → Fetch → Parse → Checks → Score → Report)
 *
 * These tests exercise the real WsgChecker pipeline end-to-end using all
 * registered check functions.  The only mocked layer is the HTTP transport
 * (axios) and external APIs (@tgwf/co2 green-hosting lookup), which isolates
 * the tests from network I/O while keeping all parsing, check, and scoring
 * logic real.
 *
 * Phase 10.1 — Integration Testing Strategy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RunResult } from '@/core/types'

// ─── Mock: HTTP transport ─────────────────────────────────────────────────────

const mockGet = vi.fn()

vi.mock('axios', () => {
  class MockAxiosError extends Error {
    response?: { status: number }
    constructor(
      message: string,
      _code?: string,
      _config?: unknown,
      _request?: unknown,
      response?: { status: number }
    ) {
      super(message)
      this.name = 'AxiosError'
      this.response = response
    }
  }
  return {
    default: { create: () => ({ get: mockGet }) },
    AxiosError: MockAxiosError,
  }
})

// Mock DNS so SSRF guard passes for example.com
const lookupMock = vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]) // NOSONAR – public IP intentional
vi.mock('node:dns/promises', () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}))

// Mock green-hosting API so tests run offline
vi.mock('@tgwf/co2', () => ({
  co2: class MockCO2 {
    perByte = () => 0.0042
  },
  hosting: { check: vi.fn().mockResolvedValue(false) },
}))

// Import subjects after mocks are in place
const { WsgChecker } = await import('@/core/index')
const {
  performanceChecks,
  semanticChecks,
  sustainabilityChecks,
  securityChecks,
  uxDesignChecks,
  hostingChecks,
} = await import('@/checks/index')

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Robots.txt that allows all crawlers. */
const ROBOTS_TXT = 'User-agent: *\nAllow: /'

/**
 * A well-structured HTML page designed to pass many WSG checks.
 * Includes semantic elements, metadata, skip link, service worker registration,
 * responsive meta, Open Graph tags, lazy images, and a labelled form.
 */
const GOOD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="A sustainable, accessible, well-structured test page.">
  <meta property="og:title" content="Test Page">
  <meta property="og:description" content="A sustainable test page.">
  <meta property="og:type" content="website">
  <title>Test Page — WSG Integration</title>
  <link rel="canonical" href="https://example.com/">
  <link rel="stylesheet" href="/styles.min.css">
  <link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin>
  <script defer src="/app.min.js"></script>
</head>
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <header role="banner">
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  </header>
  <main id="main" role="main">
    <h1>Welcome to the Test Page</h1>
    <section>
      <h2>Our Services</h2>
      <p>We provide sustainable web development services.</p>
      <img src="/images/hero.webp" alt="A team of developers working sustainably" loading="lazy" width="800" height="400">
    </section>
    <section>
      <h2>Contact Us</h2>
      <form method="post" action="/contact">
        <label for="email">Email address</label>
        <input type="email" id="email" name="email" required autocomplete="email">
        <label for="message">Message</label>
        <textarea id="message" name="message" required></textarea>
        <button type="submit">Send message</button>
      </form>
    </section>
  </main>
  <footer role="contentinfo">
    <p>&copy; 2024 Test Organisation</p>
  </footer>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  </script>
</body>
</html>`

/**
 * A minimal HTML page with many common issues — missing meta tags, no lang,
 * no alt text, inline scripts, etc.  Useful for verifying the pipeline
 * surfaces failing checks.
 */
const POOR_HTML = `<html>
<head><title>Bare page</title></head>
<body>
  <img src="/photo.jpg">
  <script>var x = 1; var y = 2;</script>
</body>
</html>`

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Set up mockGet to serve robots.txt and the main page HTML for a given URL.
 */
const setupMocks = (html: string, responseHeaders: Record<string, string> = {}): void => {
  mockGet.mockImplementation((url: string) => {
    if (String(url).includes('/robots.txt')) {
      return Promise.resolve({ status: 200, data: ROBOTS_TXT, headers: {} })
    }
    return Promise.resolve({
      status: 200,
      data: html,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'max-age=3600',
        'content-encoding': 'gzip',
        'content-length': String(html.length),
        ...responseHeaders,
      },
    })
  })
}

/** Build a WsgChecker with all production check functions registered. */
const buildChecker = (): InstanceType<typeof WsgChecker> =>
  new WsgChecker({}, [
    ...performanceChecks,
    ...semanticChecks,
    ...sustainabilityChecks,
    ...securityChecks,
    ...uxDesignChecks,
    ...hostingChecks,
  ])

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Full pipeline integration — WsgChecker.check()', () => {
  beforeEach(() => {
    mockGet.mockReset()
    lookupMock.mockReset()
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]) // NOSONAR
  })

  // ── Shape & structure ──────────────────────────────────────────────────────

  it('returns ok:true with a RunResult for a valid page', async () => {
    setupMocks(GOOD_HTML)
    const checker = buildChecker()
    const result = await checker.check('https://example.com')

    expect(result.ok).toBe(true)
  })

  it('RunResult has all required top-level fields', async () => {
    setupMocks(GOOD_HTML)
    const checker = buildChecker()
    const result = await checker.check('https://example.com')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const run: RunResult = result.value
    expect(run.url).toBe('https://example.com')
    expect(typeof run.timestamp).toBe('string')
    expect(typeof run.duration).toBe('number')
    expect(typeof run.overallScore).toBe('number')
    expect(Array.isArray(run.categoryScores)).toBe(true)
    expect(Array.isArray(run.results)).toBe(true)
    expect(typeof run.co2PerPageView).toBe('number')
    expect(run.co2Model).toBe('swd-v4')
    expect(typeof run.isGreenHosted).toBe('boolean')
  })

  it('overall score is in the 0–100 range', async () => {
    setupMocks(GOOD_HTML)
    const checker = buildChecker()
    const result = await checker.check('https://example.com')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.overallScore).toBeGreaterThanOrEqual(0)
    expect(result.value.overallScore).toBeLessThanOrEqual(100)
  })

  it('returns category scores for all four WSG categories', async () => {
    setupMocks(GOOD_HTML)
    const checker = buildChecker()
    const result = await checker.check('https://example.com')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const categories = result.value.categoryScores.map((c) => c.category)
    expect(categories).toContain('ux')
    expect(categories).toContain('web-dev')
    expect(categories).toContain('hosting')
    expect(categories).toContain('business')
  })

  it('each category score is in the 0–100 range', async () => {
    setupMocks(GOOD_HTML)
    const checker = buildChecker()
    const result = await checker.check('https://example.com')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    for (const cat of result.value.categoryScores) {
      expect(cat.score).toBeGreaterThanOrEqual(0)
      expect(cat.score).toBeLessThanOrEqual(100)
    }
  })

  // ── Check count ────────────────────────────────────────────────────────────

  it('runs all registered checks and returns one result per check', async () => {
    setupMocks(GOOD_HTML)
    const checker = buildChecker()
    const totalChecks =
      performanceChecks.length +
      semanticChecks.length +
      sustainabilityChecks.length +
      securityChecks.length +
      uxDesignChecks.length +
      hostingChecks.length

    const result = await checker.check('https://example.com')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.results).toHaveLength(totalChecks)
  })

  it('every CheckResult has the required fields', async () => {
    setupMocks(GOOD_HTML)
    const checker = buildChecker()
    const result = await checker.check('https://example.com')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    for (const check of result.value.results) {
      expect(typeof check.guidelineId).toBe('string')
      expect(typeof check.guidelineName).toBe('string')
      expect(['pass', 'fail', 'warn', 'info', 'not-applicable']).toContain(check.status)
      expect(check.score).toBeGreaterThanOrEqual(0)
      expect(check.score).toBeLessThanOrEqual(100)
      expect(['high', 'medium', 'low']).toContain(check.impact)
      expect(['ux', 'web-dev', 'hosting', 'business']).toContain(check.category)
    }
  })

  // ── Well-built vs. bare page ───────────────────────────────────────────────

  it('a well-built page scores higher than a bare minimal page', async () => {
    setupMocks(GOOD_HTML)
    const goodChecker = buildChecker()
    const goodResult = await goodChecker.check('https://example.com')
    expect(goodResult.ok).toBe(true)
    if (!goodResult.ok) return

    mockGet.mockReset()
    lookupMock.mockReset()
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]) // NOSONAR
    setupMocks(POOR_HTML)
    const poorChecker = buildChecker()
    const poorResult = await poorChecker.check('https://example.com')
    expect(poorResult.ok).toBe(true)
    if (!poorResult.ok) return

    expect(goodResult.value.overallScore).toBeGreaterThan(poorResult.value.overallScore)
  })

  // ── Error handling ─────────────────────────────────────────────────────────

  it('returns ok:false when the page cannot be fetched', async () => {
    mockGet.mockRejectedValue(new Error('Connection refused'))
    const checker = buildChecker()
    const result = await checker.check('https://example.com')

    expect(result.ok).toBe(false)
  })

  // ── CO2 estimation ─────────────────────────────────────────────────────────

  it('co2PerPageView is a non-negative number', async () => {
    setupMocks(GOOD_HTML)
    const checker = buildChecker()
    const result = await checker.check('https://example.com')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.co2PerPageView).toBeGreaterThanOrEqual(0)
  })

  // ── Duration ──────────────────────────────────────────────────────────────

  it('duration is a positive number in milliseconds', async () => {
    setupMocks(GOOD_HTML)
    const checker = buildChecker()
    const result = await checker.check('https://example.com')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.duration).toBeGreaterThanOrEqual(0)
  })

  // ── Report generation ──────────────────────────────────────────────────────

  it('fromRunResult generates a SustainabilityReport from the pipeline output', async () => {
    const { fromRunResult } = await import('@/report/index')

    setupMocks(GOOD_HTML)
    const checker = buildChecker()
    const runResult = await checker.check('https://example.com')

    expect(runResult.ok).toBe(true)
    if (!runResult.ok) return

    const { value } = runResult
    const report = fromRunResult(
      value,
      value.results[0]?.score ?? 0,
      value.categoryScores.length,
      0
    )

    expect(report).toHaveProperty('url')
    expect(report).toHaveProperty('grade')
    expect(report).toHaveProperty('overallScore')
    expect(report).toHaveProperty('summary')
    expect(report).toHaveProperty('categories')
    expect(report).toHaveProperty('recommendations')
    expect(report).toHaveProperty('metadata')
  })
})
