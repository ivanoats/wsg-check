import { describe, it, expect } from 'vitest'
import { checkCaching } from '@/checks/caching'
import type { PageData } from '@/core/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(headers: Record<string, string> = {}): PageData {
  const body = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'
  return {
    url: 'https://example.com',
    fetchResult: {
      url: 'https://example.com',
      originalUrl: 'https://example.com',
      statusCode: 200,
      headers,
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkCaching (WSG 4.2)', () => {
  it('returns guidelineId 4.2', async () => {
    const result = await checkCaching(makePageData())
    expect(result.guidelineId).toBe('4.2')
  })

  it('returns category hosting', async () => {
    const result = await checkCaching(makePageData())
    expect(result.category).toBe('hosting')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkCaching(makePageData())
    expect(result.machineTestable).toBe(true)
  })

  it('has high impact', async () => {
    const result = await checkCaching(makePageData())
    expect(result.impact).toBe('high')
  })

  it('passes when Cache-Control has max-age', async () => {
    const result = await checkCaching(makePageData({ 'cache-control': 'max-age=3600' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes when Cache-Control has s-maxage', async () => {
    const result = await checkCaching(makePageData({ 'cache-control': 's-maxage=86400' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when Cache-Control is present without max-age', async () => {
    const result = await checkCaching(makePageData({ 'cache-control': 'no-cache' }))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when only ETag is present', async () => {
    const result = await checkCaching(makePageData({ etag: '"abc123"' }))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when only Expires is present', async () => {
    const result = await checkCaching(makePageData({ expires: 'Wed, 21 Oct 2030 07:28:00 GMT' }))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('fails when no caching headers are present', async () => {
    const result = await checkCaching(makePageData({}))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('includes recommendation and resources on failure', async () => {
    const result = await checkCaching(makePageData({}))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources!.some((r) => r.startsWith('https://www.w3.org/'))).toBe(true)
  })
})
