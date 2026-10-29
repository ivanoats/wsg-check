import { describe, it, expect } from 'vitest'
import { checkOptimizedMedia } from '@/checks/optimized-media'
import type { PageData } from '@/core/types'
import { expectRecommendationAndResources } from './helpers'
import type { ResourceReference } from '@/utils/html-parser'
import { parseHtml } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SVG_ONLY_MARKUP =
  '<img src="/icon.svg?v=2" width="40" height="40">' +
  '<img src="data:image/svg+xml;base64,PHN2Zy8+" width="1" height="1">'

function makeImage(url: string, extraAttrs: Record<string, string> = {}): ResourceReference {
  return {
    type: 'image',
    url,
    attributes: { src: url, ...extraAttrs },
  }
}

function makePageData(resources: ResourceReference[]): PageData {
  const body = '<!DOCTYPE html><html><head></head><body></body></html>'
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
      resources,
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
      resourceCount: resources.length,
      firstPartyCount: resources.length,
      thirdPartyCount: 0,
      compression: { isCompressed: false },
      byType: { stylesheet: 0, script: 0, image: resources.length, font: 0, media: 0, other: 0 },
    },
  } as PageData
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkOptimizedMedia (WSG 2.7)', () => {
  it('returns guidelineId 2.7', async () => {
    const result = await checkOptimizedMedia(makePageData([]))
    expect(result.guidelineId).toBe('2.7')
  })

  it('returns category ux', async () => {
    const result = await checkOptimizedMedia(makePageData([]))
    expect(result.category).toBe('ux')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkOptimizedMedia(makePageData([]))
    expect(result.machineTestable).toBe(true)
  })

  it('returns not-applicable when no images are present', async () => {
    const result = await checkOptimizedMedia(makePageData([]))
    expect(result.status).toBe('not-applicable')
  })

  it('fails when images are present but none use WebP or AVIF', async () => {
    const resources = [
      makeImage('https://example.com/photo.jpg', { width: '800', height: '600' }),
      makeImage('https://example.com/logo.png', { width: '200', height: '100' }),
    ]
    const result = await checkOptimizedMedia(makePageData(resources))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('passes when all images use WebP with explicit dimensions', async () => {
    const resources = [
      makeImage('https://example.com/photo.webp', { width: '800', height: '600' }),
      makeImage('https://example.com/hero.avif', { width: '1200', height: '630' }),
    ]
    const result = await checkOptimizedMedia(makePageData(resources))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when WebP used but some images lack explicit dimensions', async () => {
    const resources = [
      makeImage('https://example.com/photo.webp', { width: '800', height: '600' }),
      makeImage('https://example.com/icon.webp'), // no width/height
    ]
    const result = await checkOptimizedMedia(makePageData(resources))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('detects AVIF as a modern format', async () => {
    const resources = [
      makeImage('https://cdn.example.com/hero.avif', { width: '1200', height: '630' }),
    ]
    const result = await checkOptimizedMedia(makePageData(resources))
    expect(result.status).toBe('pass')
  })

  it('includes a recommendation and resources link on fail', async () => {
    const resources = [makeImage('https://example.com/photo.jpeg')]
    const result = await checkOptimizedMedia(makePageData(resources))
    const firstResource = expectRecommendationAndResources(result)
    expect(firstResource).toContain('w3.org')
  })

  describe('SVG (vector) images', () => {
    it('passes when the only images are SVG with explicit dimensions', async () => {
      const resources = [
        makeImage('https://example.com/logo.svg', { width: '120', height: '40' }),
        makeImage('https://example.com/icon.svg', { width: '24', height: '24' }),
      ]
      const result = await checkOptimizedMedia(makePageData(resources))
      expect(result.status).toBe('pass')
      expect(result.score).toBe(100)
      expect(result.message).toContain('vector')
    })

    it('warns (not fails) when SVG-only images lack dimensions', async () => {
      const resources = [makeImage('https://example.com/logo.svg')]
      const result = await checkOptimizedMedia(makePageData(resources))
      expect(result.status).toBe('warn')
      expect(result.score).toBe(50)
      expect(result.details).toContain('width and height')
      expect(result.details).not.toContain('WebP')
      expect(result.recommendation).toContain('width and height')
      expect(result.recommendation).not.toContain('WebP')
    })

    it('still fails when a JPEG accompanies an SVG and nothing uses WebP/AVIF', async () => {
      const resources = [
        makeImage('https://example.com/logo.svg', { width: '120', height: '40' }),
        makeImage('https://example.com/photo.jpg', { width: '800', height: '600' }),
      ]
      const result = await checkOptimizedMedia(makePageData(resources))
      expect(result.status).toBe('fail')
      expect(result.score).toBe(0)
      expect(result.details).toContain('1 raster image')
      expect(result.recommendation).toContain('WebP')
      expect(result.recommendation).not.toContain('width and height')
    })

    it('treats SVG URLs with a query string and SVG data URIs as vector', async () => {
      const resources = [
        makeImage('https://example.com/icon.svg?v=2', { width: '24', height: '24' }),
        makeImage('data:image/svg+xml;base64,PHN2Zy8+', { width: '1', height: '1' }),
      ]
      const result = await checkOptimizedMedia(makePageData(resources))
      expect(result.status).toBe('pass')
    })

    it('passes for an SVG-only page parsed from HTML', async () => {
      const parsed = parseHtml(SVG_ONLY_MARKUP, 'https://x.test/')
      const result = await checkOptimizedMedia(makePageData(parsed.resources))
      expect(result.status).toBe('pass')
    })
  })
})
