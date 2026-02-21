import { describe, it, expect } from 'vitest'
import { checkDataRefresh } from '@/checks/data-refresh'
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

describe('checkDataRefresh (WSG 4.7)', () => {
  it('returns guidelineId 4.7', async () => {
    const result = await checkDataRefresh(makePageData())
    expect(result.guidelineId).toBe('4.7')
  })

  it('returns category hosting', async () => {
    const result = await checkDataRefresh(makePageData())
    expect(result.category).toBe('hosting')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkDataRefresh(makePageData())
    expect(result.machineTestable).toBe(true)
  })

  it('has medium impact', async () => {
    const result = await checkDataRefresh(makePageData())
    expect(result.impact).toBe('medium')
  })

  it('passes for max-age >= 300s', async () => {
    const result = await checkDataRefresh(makePageData({ 'cache-control': 'max-age=3600' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
    expect(result.message).toContain('3600')
  })

  it('passes for max-age exactly 300s', async () => {
    const result = await checkDataRefresh(makePageData({ 'cache-control': 'max-age=300' }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns for max-age between 60 and 299s', async () => {
    const result = await checkDataRefresh(makePageData({ 'cache-control': 'max-age=120' }))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
    expect(result.message).toContain('120')
  })

  it('fails for max-age less than 60s', async () => {
    const result = await checkDataRefresh(makePageData({ 'cache-control': 'max-age=10' }))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
    expect(result.message).toContain('10')
  })

  it('fails when no-store directive is present', async () => {
    const result = await checkDataRefresh(makePageData({ 'cache-control': 'no-store' }))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
    expect(result.message).toContain('no-store')
  })

  it('warns when no max-age or s-maxage is present', async () => {
    const result = await checkDataRefresh(makePageData({ 'cache-control': 'no-cache' }))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when no cache-control header at all', async () => {
    const result = await checkDataRefresh(makePageData({}))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('prefers s-maxage over max-age', async () => {
    const result = await checkDataRefresh(
      makePageData({ 'cache-control': 'max-age=10, s-maxage=3600' })
    )
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('includes recommendation and resources when warn', async () => {
    const result = await checkDataRefresh(makePageData({}))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources!.some((r) => r.startsWith('https://www.w3.org/'))).toBe(true)
  })
})
