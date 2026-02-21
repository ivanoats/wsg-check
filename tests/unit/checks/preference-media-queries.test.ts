import { describe, it, expect } from 'vitest'
import { checkPreferenceMediaQueries } from '@/checks/preference-media-queries'
import type { PageData } from '@/core/types'
import type { LinkRef } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(body: string, links: LinkRef[] = []): PageData {
  return {
    url: 'https://example.com',
    fetchResult: {
      url: 'https://example.com',
      originalUrl: 'https://example.com',
      statusCode: 200,
      headers: {},
      body,
      redirectChain: [],
      fromCache: false,
      contentLength: body.length,
    },
    parsedPage: {
      title: 'Test',
      lang: 'en',
      metaTags: [],
      links,
      resources: [],
      headings: [],
      hasSkipLink: false,
      landmarks: [],
      ariaAttributes: [],
      structuredData: [],
      doctype: '<!DOCTYPE html>',
      formInputs: [],
    },
    pageWeight: {
      htmlSize: body.length,
      resourceCount: 0,
      firstPartyCount: 0,
      thirdPartyCount: 0,
      compression: { isCompressed: false },
      byType: { stylesheet: 0, script: 0, image: 0, font: 0, media: 0, other: 0 },
    },
  } as PageData
}

/** HTML with all three preference media queries in an inline style block. */
const ALL_PREFERENCES_HTML = `<!DOCTYPE html><html lang="en"><head><title>T</title>
<style>
  @media (prefers-color-scheme: dark) { body { background: #000; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none; } }
  @media (prefers-reduced-data: reduce) { img { display: none; } }
</style>
</head><body></body></html>`

/** HTML with only prefers-color-scheme. */
const COLOR_SCHEME_ONLY_HTML = `<!DOCTYPE html><html lang="en"><head><title>T</title>
<style>
  @media (prefers-color-scheme: dark) { body { background: #111; } }
</style>
</head><body></body></html>`

/** HTML with no preference media queries. */
const NO_PREFERENCES_HTML = `<!DOCTYPE html><html lang="en"><head>
  <title>Test</title>
  <style>body { margin: 0; } @media (max-width: 768px) { .container { width: 100%; } }</style>
</head><body></body></html>`

/** HTML with no style blocks at all. */
const NO_STYLE_HTML = `<!DOCTYPE html><html lang="en"><head><title>T</title></head><body></body></html>`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkPreferenceMediaQueries (WSG 3.12)', () => {
  it('returns guidelineId 3.12', async () => {
    const result = await checkPreferenceMediaQueries(makePageData(NO_STYLE_HTML))
    expect(result.guidelineId).toBe('3.12')
  })

  it('returns category web-dev', async () => {
    const result = await checkPreferenceMediaQueries(makePageData(NO_STYLE_HTML))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkPreferenceMediaQueries(makePageData(NO_STYLE_HTML))
    expect(result.machineTestable).toBe(true)
  })

  it('passes when all three preference features are present in inline CSS', async () => {
    const result = await checkPreferenceMediaQueries(makePageData(ALL_PREFERENCES_HTML))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when only some preference features are present', async () => {
    const result = await checkPreferenceMediaQueries(makePageData(COLOR_SCHEME_ONLY_HTML))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warn result details mention missing features', async () => {
    const result = await checkPreferenceMediaQueries(makePageData(COLOR_SCHEME_ONLY_HTML))
    expect(result.details).toContain('prefers-reduced-motion')
    expect(result.details).toContain('prefers-reduced-data')
  })

  it('warns when no preference features are present', async () => {
    const result = await checkPreferenceMediaQueries(makePageData(NO_PREFERENCES_HTML))
    expect(result.status).toBe('warn')
  })

  it('recommendation mentions dark mode OLED energy savings when color-scheme is missing', async () => {
    const result = await checkPreferenceMediaQueries(makePageData(NO_STYLE_HTML))
    expect(result.recommendation).toContain('OLED')
    expect(result.recommendation).toContain('47%')
  })

  it('recommendation does NOT mention OLED energy savings when color-scheme is already present', async () => {
    const result = await checkPreferenceMediaQueries(makePageData(COLOR_SCHEME_ONLY_HTML))
    expect(result.recommendation).not.toContain('OLED')
  })

  it('detects preference features via <link> media attributes', async () => {
    const links: LinkRef[] = [
      { rel: 'stylesheet', href: '/dark.css', media: '(prefers-color-scheme: dark)' },
      { rel: 'stylesheet', href: '/motion.css', media: '(prefers-reduced-motion: reduce)' },
      { rel: 'stylesheet', href: '/data.css', media: '(prefers-reduced-data: reduce)' },
    ]
    const result = await checkPreferenceMediaQueries(makePageData(NO_STYLE_HTML, links))
    expect(result.status).toBe('pass')
  })

  it('combines inline CSS and link media attribute detection', async () => {
    const links: LinkRef[] = [
      { rel: 'stylesheet', href: '/dark.css', media: '(prefers-color-scheme: dark)' },
    ]
    // prefers-reduced-motion and prefers-reduced-data still missing
    const result = await checkPreferenceMediaQueries(makePageData(COLOR_SCHEME_ONLY_HTML, links))
    // color-scheme is found both inline and via link, others still missing
    expect(result.status).toBe('warn')
    expect(result.details).toContain('prefers-reduced-motion')
  })

  it('includes a recommendation and resources link on warn', async () => {
    const result = await checkPreferenceMediaQueries(makePageData(NO_STYLE_HTML))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
