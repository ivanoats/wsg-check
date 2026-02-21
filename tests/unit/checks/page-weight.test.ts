import { describe, it, expect } from 'vitest'
import { checkPageWeight } from '@/checks/page-weight'
import type { PageData } from '@/core/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Build a minimal PageData stub with configurable HTML size and resource count. */
function makePageData(htmlSize: number, resourceCount = 0): PageData {
  return {
    url: 'https://example.com',
    fetchResult: {
      url: 'https://example.com',
      originalUrl: 'https://example.com',
      statusCode: 200,
      headers: {},
      body: 'x'.repeat(htmlSize),
      redirectChain: [],
      fromCache: false,
      contentLength: htmlSize,
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
      htmlSize,
      resourceCount,
      firstPartyCount: resourceCount,
      thirdPartyCount: 0,
      compression: { isCompressed: false },
      byType: { stylesheet: 0, script: 0, image: 0, font: 0, media: 0, other: 0 },
    },
  } as PageData
}

const KB = 1024

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkPageWeight (WSG 3.1)', () => {
  it('returns guidelineId 3.1', async () => {
    const result = await checkPageWeight(makePageData(10 * KB))
    expect(result.guidelineId).toBe('3.1')
  })

  it('returns category web-dev', async () => {
    const result = await checkPageWeight(makePageData(10 * KB))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkPageWeight(makePageData(10 * KB))
    expect(result.machineTestable).toBe(true)
  })

  it('passes for a small HTML document with few resources', async () => {
    const result = await checkPageWeight(makePageData(50 * KB, 10))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when HTML size is between 100 KB and 500 KB', async () => {
    const result = await checkPageWeight(makePageData(200 * KB))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
    expect(result.details).toContain('KB')
  })

  it('fails when HTML size exceeds 500 KB', async () => {
    const result = await checkPageWeight(makePageData(600 * KB))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('warns when resource count is between 50 and 100', async () => {
    const result = await checkPageWeight(makePageData(10 * KB, 60))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
    expect(result.details).toContain('60')
  })

  it('fails when resource count exceeds 100', async () => {
    const result = await checkPageWeight(makePageData(10 * KB, 110))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
    expect(result.details).toContain('110')
  })

  it('fails (not warns) when both HTML size and resource count exceed fail thresholds', async () => {
    const result = await checkPageWeight(makePageData(600 * KB, 110))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('fails when HTML size exceeds fail threshold even if resources are within warn', async () => {
    const result = await checkPageWeight(makePageData(600 * KB, 60))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('includes a recommendation and resources link when failing', async () => {
    const result = await checkPageWeight(makePageData(600 * KB))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })

  it('pass message includes the document size and resource count', async () => {
    const result = await checkPageWeight(makePageData(50 * KB, 5))
    expect(result.message).toContain('KB')
    expect(result.message).toContain('5')
  })

  it('passes at exactly the HTML warn threshold boundary (100 KB is not above threshold)', async () => {
    const result = await checkPageWeight(makePageData(100 * KB))
    expect(result.status).toBe('pass')
  })

  it('warns at 100 KB + 1 byte', async () => {
    const result = await checkPageWeight(makePageData(100 * KB + 1))
    expect(result.status).toBe('warn')
  })
})
