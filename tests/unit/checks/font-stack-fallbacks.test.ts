import { describe, it, expect } from 'vitest'
import { checkFontStackFallbacks } from '@/checks/font-stack-fallbacks'
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

const NO_FONT_FAMILY_BODY = '<!DOCTYPE html><html><head></head><body></body></html>'

const WITH_GOOD_FALLBACK = `<!DOCTYPE html><html><head>
<style>
  body { font-family: "Inter", sans-serif; }
</style>
</head><body></body></html>`

const WITH_SYSTEM_FONT_FALLBACK = `<!DOCTYPE html><html><head>
<style>
  body { font-family: "MyFont", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
</style>
</head><body></body></html>`

const WITHOUT_FALLBACK = `<!DOCTYPE html><html><head>
<style>
  body { font-family: "ExoticCustomFont"; }
</style>
</head><body></body></html>`

const MIXED_STACKS = `<!DOCTYPE html><html><head>
<style>
  body { font-family: "Inter", sans-serif; }
  h1 { font-family: "Heading Font"; }
</style>
</head><body></body></html>`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkFontStackFallbacks (WSG 2.16)', () => {
  it('returns guidelineId 2.16', async () => {
    const result = await checkFontStackFallbacks(makePageData(NO_FONT_FAMILY_BODY))
    expect(result.guidelineId).toBe('2.16')
  })

  it('returns category ux', async () => {
    const result = await checkFontStackFallbacks(makePageData(NO_FONT_FAMILY_BODY))
    expect(result.category).toBe('ux')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkFontStackFallbacks(makePageData(NO_FONT_FAMILY_BODY))
    expect(result.machineTestable).toBe(true)
  })

  it('returns not-applicable when no font-family declarations are found', async () => {
    const result = await checkFontStackFallbacks(makePageData(NO_FONT_FAMILY_BODY))
    expect(result.status).toBe('not-applicable')
  })

  it('passes when font-family includes a generic family keyword', async () => {
    const result = await checkFontStackFallbacks(makePageData(WITH_GOOD_FALLBACK))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes when font-family includes system fonts like -apple-system', async () => {
    const result = await checkFontStackFallbacks(makePageData(WITH_SYSTEM_FONT_FALLBACK))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when a font-family declaration has no fallback', async () => {
    const result = await checkFontStackFallbacks(makePageData(WITHOUT_FALLBACK))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when only some declarations lack fallbacks', async () => {
    const result = await checkFontStackFallbacks(makePageData(MIXED_STACKS))
    expect(result.status).toBe('warn')
    expect(result.message).toContain('1')
  })

  it('includes a recommendation and resources link on warn', async () => {
    const result = await checkFontStackFallbacks(makePageData(WITHOUT_FALLBACK))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
