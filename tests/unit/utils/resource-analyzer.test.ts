import { describe, it, expect } from 'vitest'
import { classifyResources, analyzeCompression, analyzePageWeight } from '@/utils/resource-analyzer'
import type { FetchResult } from '@/utils/http-client'
import type { ParsedPage } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeFetchResult(overrides: Partial<FetchResult> = {}): FetchResult {
  return {
    url: 'https://example.com/',
    originalUrl: 'https://example.com/',
    statusCode: 200,
    headers: {},
    body: '<html></html>',
    redirectChain: [],
    fromCache: false,
    contentLength: 14,
    ...overrides,
  }
}

function makeParsedPage(overrides: Partial<ParsedPage> = {}): ParsedPage {
  return {
    title: null,
    lang: null,
    metaTags: [],
    links: [],
    resources: [],
    headings: [],
    hasSkipLink: false,
    landmarks: [],
    ariaAttributes: [],
    structuredData: [],
    doctype: null,
    formInputs: [],
    ...overrides,
  }
}

// ─── classifyResources ────────────────────────────────────────────────────────

describe('classifyResources', () => {
  it('marks same-origin resources as first-party', () => {
    const resources = [
      { type: 'stylesheet' as const, url: 'https://example.com/style.css', attributes: {} },
    ]
    const classified = classifyResources(resources, 'https://example.com/')
    expect(classified[0].isThirdParty).toBe(false)
  })

  it('marks different-origin resources as third-party', () => {
    const resources = [
      { type: 'script' as const, url: 'https://cdn.google.com/analytics.js', attributes: {} },
    ]
    const classified = classifyResources(resources, 'https://example.com/')
    expect(classified[0].isThirdParty).toBe(true)
  })

  it('correctly identifies different ccTLD sites as third-party', () => {
    const resources = [{ type: 'script' as const, url: 'https://bar.co.uk/lib.js', attributes: {} }]
    const classified = classifyResources(resources, 'https://foo.co.uk/')
    expect(classified[0].isThirdParty).toBe(true)
  })

  it('treats www.example.com and example.com as the same site', () => {
    const resources = [
      { type: 'image' as const, url: 'https://www.example.com/img.png', attributes: {} },
    ]
    const classified = classifyResources(resources, 'https://example.com/')
    expect(classified[0].isThirdParty).toBe(false)
  })

  it('returns an empty array for a page with no resources', () => {
    expect(classifyResources([], 'https://example.com/')).toEqual([])
  })

  it('preserves the resource type in the result', () => {
    const resources = [
      { type: 'font' as const, url: 'https://example.com/font.woff2', attributes: {} },
    ]
    const classified = classifyResources(resources, 'https://example.com/')
    expect(classified[0].type).toBe('font')
  })
})

// ─── analyzeCompression ───────────────────────────────────────────────────────

describe('analyzeCompression', () => {
  it('detects gzip encoding', () => {
    const result = analyzeCompression({ 'content-encoding': 'gzip' })
    expect(result.isCompressed).toBe(true)
    expect(result.type).toBe('gzip')
  })

  it('detects brotli encoding', () => {
    const result = analyzeCompression({ 'content-encoding': 'br' })
    expect(result.isCompressed).toBe(true)
    expect(result.type).toBe('br')
  })

  it('detects zstd encoding', () => {
    const result = analyzeCompression({ 'content-encoding': 'zstd' })
    expect(result.isCompressed).toBe(true)
    expect(result.type).toBe('zstd')
  })

  it('detects deflate encoding', () => {
    const result = analyzeCompression({ 'content-encoding': 'deflate' })
    expect(result.isCompressed).toBe(true)
    expect(result.type).toBe('deflate')
  })

  it('handles x-gzip alias', () => {
    const result = analyzeCompression({ 'content-encoding': 'x-gzip' })
    expect(result.isCompressed).toBe(true)
    expect(result.type).toBe('gzip')
  })

  it('returns not compressed when header is absent', () => {
    const result = analyzeCompression({})
    expect(result.isCompressed).toBe(false)
    expect(result.type).toBeUndefined()
  })

  it('returns not compressed when header is empty', () => {
    const result = analyzeCompression({ 'content-encoding': '' })
    expect(result.isCompressed).toBe(false)
  })

  it('handles unknown encoding values gracefully', () => {
    const result = analyzeCompression({ 'content-encoding': 'identity' })
    expect(result.isCompressed).toBe(true)
    expect(result.type).toBe('identity')
  })
})

// ─── analyzePageWeight ────────────────────────────────────────────────────────

describe('analyzePageWeight', () => {
  it('uses the fetch result content length as htmlSize', () => {
    const fetchResult = makeFetchResult({ contentLength: 4096 })
    const analysis = analyzePageWeight(fetchResult, makeParsedPage())
    expect(analysis.htmlSize).toBe(4096)
  })

  it('counts total resources', () => {
    const parsedPage = makeParsedPage({
      resources: [
        { type: 'stylesheet', url: 'https://example.com/style.css', attributes: {} },
        { type: 'script', url: 'https://example.com/app.js', attributes: {} },
      ],
    })
    const analysis = analyzePageWeight(makeFetchResult(), parsedPage)
    expect(analysis.resourceCount).toBe(2)
  })

  it('counts first-party and third-party resources separately', () => {
    const parsedPage = makeParsedPage({
      resources: [
        { type: 'stylesheet', url: 'https://example.com/style.css', attributes: {} },
        { type: 'script', url: 'https://cdn.third-party.com/lib.js', attributes: {} },
      ],
    })
    const analysis = analyzePageWeight(makeFetchResult(), parsedPage, 'https://example.com/')
    expect(analysis.firstPartyCount).toBe(1)
    expect(analysis.thirdPartyCount).toBe(1)
  })

  it('includes compression info from response headers', () => {
    const fetchResult = makeFetchResult({ headers: { 'content-encoding': 'br' } })
    const analysis = analyzePageWeight(fetchResult, makeParsedPage())
    expect(analysis.compression.isCompressed).toBe(true)
    expect(analysis.compression.type).toBe('br')
  })

  it('breaks down resource counts by type', () => {
    const parsedPage = makeParsedPage({
      resources: [
        { type: 'stylesheet', url: 'https://example.com/a.css', attributes: {} },
        { type: 'stylesheet', url: 'https://example.com/b.css', attributes: {} },
        { type: 'script', url: 'https://example.com/app.js', attributes: {} },
        { type: 'image', url: 'https://example.com/hero.jpg', attributes: {} },
      ],
    })
    const analysis = analyzePageWeight(makeFetchResult(), parsedPage)
    expect(analysis.byType.stylesheet).toBe(2)
    expect(analysis.byType.script).toBe(1)
    expect(analysis.byType.image).toBe(1)
    expect(analysis.byType.font).toBe(0)
  })

  it('returns zero counts for a page with no resources', () => {
    const analysis = analyzePageWeight(makeFetchResult(), makeParsedPage())
    expect(analysis.resourceCount).toBe(0)
    expect(analysis.firstPartyCount).toBe(0)
    expect(analysis.thirdPartyCount).toBe(0)
  })
})
