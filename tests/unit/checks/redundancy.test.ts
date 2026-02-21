import { describe, it, expect } from 'vitest'
import { checkCssRedundancy } from '@/checks/redundancy'
import type { PageData } from '@/core/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(body: string): PageData {
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
      links: [],
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

/** HTML with no inline styles. */
const CLEAN_HTML = `<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body><p class="intro">Hello</p></body></html>`

/** HTML with a single inline style value repeated 3 times. */
const REPEATED_INLINE_STYLES = `<!DOCTYPE html><html><body>
  <p style="color: red; font-weight: bold;">One</p>
  <p style="color: red; font-weight: bold;">Two</p>
  <p style="color: red; font-weight: bold;">Three</p>
</body></html>`

/** HTML with the same style value repeated only twice (below threshold). */
const TWO_REPEATED_STYLES = `<!DOCTYPE html><html><body>
  <p style="color: blue;">One</p>
  <p style="color: blue;">Two</p>
</body></html>`

/** HTML with a single inline style value repeated 3 times using single quotes. */
const REPEATED_SINGLE_QUOTE_STYLES = `<!DOCTYPE html><html><body>
  <p style='color: red; font-weight: bold;'>One</p>
  <p style='color: red; font-weight: bold;'>Two</p>
  <p style='color: red; font-weight: bold;'>Three</p>
</body></html>`

const MULTIPLE_STYLE_BLOCKS = `<!DOCTYPE html><html><head>
  <style>body { margin: 0; }</style>
  <style>h1 { color: blue; }</style>
</head><body><h1>Title</h1></body></html>`

/** HTML with a single style block (no redundancy). */
const SINGLE_STYLE_BLOCK = `<!DOCTYPE html><html><head>
  <style>body { margin: 0; } h1 { color: blue; }</style>
</head><body><h1>Title</h1></body></html>`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkCssRedundancy (WSG 3.5)', () => {
  it('returns guidelineId 3.5', async () => {
    const result = await checkCssRedundancy(makePageData(CLEAN_HTML))
    expect(result.guidelineId).toBe('3.5')
  })

  it('returns category web-dev', async () => {
    const result = await checkCssRedundancy(makePageData(CLEAN_HTML))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkCssRedundancy(makePageData(CLEAN_HTML))
    expect(result.machineTestable).toBe(true)
  })

  it('passes for clean HTML with no inline styles', async () => {
    const result = await checkCssRedundancy(makePageData(CLEAN_HTML))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when the same inline style value appears 3+ times', async () => {
    const result = await checkCssRedundancy(makePageData(REPEATED_INLINE_STYLES))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warn result details mention the repeated style value', async () => {
    const result = await checkCssRedundancy(makePageData(REPEATED_INLINE_STYLES))
    expect(result.details).toContain('inline style value')
  })

  it('passes when a style value appears only twice (below threshold)', async () => {
    const result = await checkCssRedundancy(makePageData(TWO_REPEATED_STYLES))
    expect(result.status).toBe('pass')
  })

  it('warns when the same single-quoted inline style value appears 3+ times', async () => {
    const result = await checkCssRedundancy(makePageData(REPEATED_SINGLE_QUOTE_STYLES))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when there are multiple inline <style> blocks', async () => {
    const result = await checkCssRedundancy(makePageData(MULTIPLE_STYLE_BLOCKS))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('<style> blocks')
  })

  it('passes when there is only a single <style> block', async () => {
    const result = await checkCssRedundancy(makePageData(SINGLE_STYLE_BLOCK))
    expect(result.status).toBe('pass')
  })

  it('passes for empty HTML body', async () => {
    const result = await checkCssRedundancy(makePageData(''))
    expect(result.status).toBe('pass')
  })

  it('includes a recommendation and resources link on warn', async () => {
    const result = await checkCssRedundancy(makePageData(REPEATED_INLINE_STYLES))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
