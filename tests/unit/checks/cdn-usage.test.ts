import { describe, it, expect } from 'vitest'
import { checkCdnUsage } from '@/checks/cdn-usage'
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

describe('checkCdnUsage (WSG 4.10)', () => {
  it('returns guidelineId 4.10', async () => {
    const result = await checkCdnUsage(makePageData())
    expect(result.guidelineId).toBe('4.10')
  })

  it('returns category hosting', async () => {
    const result = await checkCdnUsage(makePageData())
    expect(result.category).toBe('hosting')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkCdnUsage(makePageData())
    expect(result.machineTestable).toBe(true)
  })

  it('has medium impact', async () => {
    const result = await checkCdnUsage(makePageData())
    expect(result.impact).toBe('medium')
  })

  it('passes when Cloudflare cf-ray header is present', async () => {
    const result = await checkCdnUsage(makePageData({ 'cf-ray': '7abc123-LHR' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
    expect(result.message).toContain('Cloudflare')
  })

  it('passes when Amazon CloudFront x-amz-cf-id header is present', async () => {
    const result = await checkCdnUsage(makePageData({ 'x-amz-cf-id': 'some-cf-id' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes when x-cache header is present', async () => {
    const result = await checkCdnUsage(makePageData({ 'x-cache': 'HIT from cloudfront' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes when Fastly x-fastly-request-id header is present', async () => {
    const result = await checkCdnUsage(makePageData({ 'x-fastly-request-id': 'abc123' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes when age header is present (downstream cache)', async () => {
    const result = await checkCdnUsage(makePageData({ age: '120' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes when via header is present', async () => {
    const result = await checkCdnUsage(makePageData({ via: '1.1 varnish' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when no CDN headers are present', async () => {
    const result = await checkCdnUsage(makePageData({}))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('includes recommendation and resources on warn', async () => {
    const result = await checkCdnUsage(makePageData({}))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources!.some((r) => r.startsWith('https://www.w3.org/'))).toBe(true)
  })

  it('reports all detected CDN headers in the message', async () => {
    const result = await checkCdnUsage(makePageData({ 'cf-ray': 'abc', 'x-cache': 'HIT' }))
    expect(result.status).toBe('pass')
    expect(result.message).toContain('Cloudflare')
    expect(result.message).toContain('x-cache')
  })
})
