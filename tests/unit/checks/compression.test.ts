import { describe, it, expect } from 'vitest'
import { checkCompression } from '@/checks/compression'
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

describe('checkCompression (WSG 4.3)', () => {
  it('returns guidelineId 4.3', async () => {
    const result = await checkCompression(makePageData())
    expect(result.guidelineId).toBe('4.3')
  })

  it('returns category hosting', async () => {
    const result = await checkCompression(makePageData())
    expect(result.category).toBe('hosting')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkCompression(makePageData())
    expect(result.machineTestable).toBe(true)
  })

  it('has high impact', async () => {
    const result = await checkCompression(makePageData())
    expect(result.impact).toBe('high')
  })

  it('passes for Brotli (br) encoding', async () => {
    const result = await checkCompression(makePageData({ 'content-encoding': 'br' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
    expect(result.message).toContain('Brotli')
  })

  it('passes for gzip encoding', async () => {
    const result = await checkCompression(makePageData({ 'content-encoding': 'gzip' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes for x-gzip encoding', async () => {
    const result = await checkCompression(makePageData({ 'content-encoding': 'x-gzip' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes for zstd encoding', async () => {
    const result = await checkCompression(makePageData({ 'content-encoding': 'zstd' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes for deflate encoding', async () => {
    const result = await checkCompression(makePageData({ 'content-encoding': 'deflate' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('fails when no content-encoding header is present', async () => {
    const result = await checkCompression(makePageData({}))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('includes recommendation and resources on failure', async () => {
    const result = await checkCompression(makePageData({}))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources!.some((r) => r.startsWith('https://www.w3.org/'))).toBe(true)
  })

  it('non-Brotli pass result includes a Brotli upgrade recommendation', async () => {
    const result = await checkCompression(makePageData({ 'content-encoding': 'gzip' }))
    expect(result.status).toBe('pass')
    expect(result.recommendation).toContain('Brotli')
  })

  it('Brotli pass result does not include a recommendation', async () => {
    const result = await checkCompression(makePageData({ 'content-encoding': 'br' }))
    expect(result.status).toBe('pass')
    expect(result.recommendation).toBeUndefined()
  })
})
