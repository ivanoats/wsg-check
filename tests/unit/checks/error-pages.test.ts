import { describe, it, expect } from 'vitest'
import { checkErrorPages } from '@/checks/error-pages'
import type { PageData } from '@/core/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(statusCode = 200): PageData {
  const body = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'
  return {
    url: 'https://example.com',
    fetchResult: {
      url: 'https://example.com',
      originalUrl: 'https://example.com',
      statusCode,
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkErrorPages (WSG 4.4)', () => {
  it('returns guidelineId 4.4', async () => {
    const result = await checkErrorPages(makePageData())
    expect(result.guidelineId).toBe('4.4')
  })

  it('returns category hosting', async () => {
    const result = await checkErrorPages(makePageData())
    expect(result.category).toBe('hosting')
  })

  it('is not marked as fully machine-testable', async () => {
    const result = await checkErrorPages(makePageData())
    expect(result.machineTestable).toBe(false)
  })

  it('has medium impact', async () => {
    const result = await checkErrorPages(makePageData())
    expect(result.impact).toBe('medium')
  })

  it('returns info status for a 200 response (requires manual verification)', async () => {
    const result = await checkErrorPages(makePageData(200))
    expect(result.status).toBe('info')
    expect(result.message).toContain('Manual verification')
  })

  it('fails when the status code is not 200', async () => {
    const result = await checkErrorPages(makePageData(500))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
    expect(result.message).toContain('500')
  })

  it('fails for a 404 status on the requested URL', async () => {
    const result = await checkErrorPages(makePageData(404))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('includes a recommendation for manual 404 testing', async () => {
    const result = await checkErrorPages(makePageData(200))
    expect(result.recommendation).toBeDefined()
    expect(result.recommendation).toContain('404')
  })

  it('includes resources link', async () => {
    const result = await checkErrorPages(makePageData(200))
    expect(result.resources).toBeDefined()
    expect(result.resources!.some((r) => r.startsWith('https://www.w3.org/'))).toBe(true)
  })
})
