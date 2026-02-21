import { describe, it, expect } from 'vitest'
import { checkLazyLoading } from '@/checks/lazy-loading'
import type { PageData } from '@/core/types'
import type { ResourceReference } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeImage(url: string, loading?: string): ResourceReference {
  const attributes: Record<string, string> = { src: url }
  if (loading !== undefined) attributes.loading = loading
  return { type: 'image', url, attributes }
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

describe('checkLazyLoading (WSG 2.11)', () => {
  it('returns guidelineId 2.11', async () => {
    const result = await checkLazyLoading(makePageData([]))
    expect(result.guidelineId).toBe('2.11')
  })

  it('returns category ux', async () => {
    const result = await checkLazyLoading(makePageData([]))
    expect(result.category).toBe('ux')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkLazyLoading(makePageData([]))
    expect(result.machineTestable).toBe(true)
  })

  it('returns not-applicable when no images are present', async () => {
    const result = await checkLazyLoading(makePageData([]))
    expect(result.status).toBe('not-applicable')
  })

  it('passes when only one image is present (likely LCP/hero)', async () => {
    const result = await checkLazyLoading(makePageData([makeImage('https://example.com/hero.jpg')]))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('fails when multiple images are present and none are lazy-loaded', async () => {
    const result = await checkLazyLoading(
      makePageData([
        makeImage('https://example.com/a.jpg'),
        makeImage('https://example.com/b.jpg'),
        makeImage('https://example.com/c.jpg'),
      ])
    )
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('passes when all non-first images are lazy-loaded', async () => {
    const result = await checkLazyLoading(
      makePageData([
        makeImage('https://example.com/hero.jpg'), // no lazy — LCP
        makeImage('https://example.com/b.jpg', 'lazy'),
        makeImage('https://example.com/c.jpg', 'lazy'),
      ])
    )
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when some but not all non-first images are lazy-loaded', async () => {
    const result = await checkLazyLoading(
      makePageData([
        makeImage('https://example.com/hero.jpg'),
        makeImage('https://example.com/b.jpg', 'lazy'),
        makeImage('https://example.com/c.jpg'), // missing lazy
      ])
    )
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('includes a recommendation and resources link on fail', async () => {
    const result = await checkLazyLoading(
      makePageData([makeImage('https://example.com/a.jpg'), makeImage('https://example.com/b.jpg')])
    )
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
