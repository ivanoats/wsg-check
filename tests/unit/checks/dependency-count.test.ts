import { describe, it, expect } from 'vitest'
import { checkDependencyCount } from '@/checks/dependency-count'
import type { PageData } from '@/core/types'
import type { PageWeightAnalysis } from '@/utils/resource-analyzer'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(pageWeight: Partial<PageWeightAnalysis> = {}): PageData {
  const body = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'
  const defaultWeight: PageWeightAnalysis = {
    htmlSize: body.length,
    resourceCount: 0,
    firstPartyCount: 0,
    thirdPartyCount: 0,
    compression: { isCompressed: false },
    byType: { stylesheet: 0, script: 0, image: 0, font: 0, media: 0, other: 0 },
  }
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
      resources: [],
      headings: [],
      hasSkipLink: false,
      landmarks: [],
      ariaAttributes: [],
      structuredData: [],
      doctype: '<!DOCTYPE html>',
      formInputs: [],
    },
    pageWeight: { ...defaultWeight, ...pageWeight },
  } as PageData
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkDependencyCount (WSG 3.16)', () => {
  it('returns guidelineId 3.16', async () => {
    const result = await checkDependencyCount(makePageData())
    expect(result.guidelineId).toBe('3.16')
  })

  it('returns category web-dev', async () => {
    const result = await checkDependencyCount(makePageData())
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkDependencyCount(makePageData())
    expect(result.machineTestable).toBe(true)
  })

  it('passes when there are no third-party resources', async () => {
    const result = await checkDependencyCount(makePageData({ thirdPartyCount: 0 }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when there are 1–9 third-party resources', async () => {
    const result = await checkDependencyCount(
      makePageData({
        thirdPartyCount: 5,
        byType: { stylesheet: 2, script: 3, image: 0, font: 0, media: 0, other: 0 },
      })
    )
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('fails when there are 10+ third-party resources', async () => {
    const result = await checkDependencyCount(
      makePageData({
        thirdPartyCount: 10,
        byType: { stylesheet: 3, script: 7, image: 0, font: 0, media: 0, other: 0 },
      })
    )
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('includes the third-party count in the message', async () => {
    const result = await checkDependencyCount(makePageData({ thirdPartyCount: 3 }))
    expect(result.message).toContain('3')
  })

  it('includes a recommendation and resources link on failure', async () => {
    const result = await checkDependencyCount(
      makePageData({
        thirdPartyCount: 12,
        byType: { stylesheet: 0, script: 12, image: 0, font: 0, media: 0, other: 0 },
      })
    )
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })

  it('has high impact', async () => {
    const result = await checkDependencyCount(makePageData({ thirdPartyCount: 1 }))
    expect(result.impact).toBe('high')
  })
})
