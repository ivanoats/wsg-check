import { describe, it, expect } from 'vitest'
import { checkRedirects } from '@/checks/redirects'
import type { PageData } from '@/core/types'
import type { RedirectEntry } from '@/utils/http-client'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(redirectChain: RedirectEntry[] = []): PageData {
  const body = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'
  return {
    url: 'https://example.com',
    fetchResult: {
      url: 'https://example.com',
      originalUrl: 'https://example.com',
      statusCode: 200,
      headers: {},
      body,
      redirectChain,
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

function makeRedirect(
  statusCode: number,
  from = 'https://example.com/old',
  to = 'https://example.com/new'
): RedirectEntry {
  return { url: from, statusCode, location: to }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkRedirects (WSG 4.4)', () => {
  it('returns guidelineId 4.4', async () => {
    const result = await checkRedirects(makePageData())
    expect(result.guidelineId).toBe('4.4')
  })

  it('returns category hosting', async () => {
    const result = await checkRedirects(makePageData())
    expect(result.category).toBe('hosting')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkRedirects(makePageData())
    expect(result.machineTestable).toBe(true)
  })

  it('has medium impact', async () => {
    const result = await checkRedirects(makePageData())
    expect(result.impact).toBe('medium')
  })

  it('passes when there are no redirects', async () => {
    const result = await checkRedirects(makePageData([]))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes with a single permanent (301) redirect', async () => {
    const result = await checkRedirects(makePageData([makeRedirect(301)]))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes with two permanent (301) redirects', async () => {
    const chain = [makeRedirect(301), makeRedirect(308)]
    const result = await checkRedirects(makePageData(chain))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when there is a temporary (302) redirect', async () => {
    const result = await checkRedirects(makePageData([makeRedirect(302)]))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
    expect(result.message).toContain('temporary')
  })

  it('warns when there is a temporary (307) redirect', async () => {
    const result = await checkRedirects(makePageData([makeRedirect(307)]))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('fails with a redirect chain of 3 or more hops', async () => {
    const chain = [makeRedirect(301), makeRedirect(301), makeRedirect(302)]
    const result = await checkRedirects(makePageData(chain))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
    expect(result.message).toContain('3 hops')
  })

  it('includes recommendation and resources on chain failure', async () => {
    const chain = [makeRedirect(301), makeRedirect(301), makeRedirect(301)]
    const result = await checkRedirects(makePageData(chain))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources!.some((r) => r.startsWith('https://www.w3.org/'))).toBe(true)
  })
})
