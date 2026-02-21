import { describe, it, expect } from 'vitest'
import { checkOptimizedMedia } from '@/checks/optimized-media'
import type { PageData } from '@/core/types'
import type { ResourceReference } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
