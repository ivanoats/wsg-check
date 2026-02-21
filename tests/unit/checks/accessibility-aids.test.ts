import { describe, it, expect } from 'vitest'
import { checkAccessibilityAids } from '@/checks/accessibility-aids'
import type { PageData } from '@/core/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(opts: { hasSkipLink?: boolean; landmarks?: string[] }): PageData {
  const { hasSkipLink = false, landmarks = [] } = opts
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
      resources: [],
      headings: [],
      hasSkipLink,
      landmarks,
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

describe('checkAccessibilityAids (WSG 3.9)', () => {
  it('returns guidelineId 3.9', async () => {
    const result = await checkAccessibilityAids(makePageData({}))
    expect(result.guidelineId).toBe('3.9')
  })

  it('returns category web-dev', async () => {
    const result = await checkAccessibilityAids(makePageData({}))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkAccessibilityAids(makePageData({}))
    expect(result.machineTestable).toBe(true)
  })

  it('returns not-applicable when there is no navigation structure at all', async () => {
    const result = await checkAccessibilityAids(makePageData({ hasSkipLink: false, landmarks: [] }))
    expect(result.status).toBe('not-applicable')
  })

  it('passes when a skip link and main landmark are both present', async () => {
    const result = await checkAccessibilityAids(
      makePageData({ hasSkipLink: true, landmarks: ['main', 'nav'] })
    )
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('fails when a nav landmark is present but no skip link', async () => {
    const result = await checkAccessibilityAids(
      makePageData({ hasSkipLink: false, landmarks: ['main', 'nav'] })
    )
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('fail result mentions the missing skip link in details', async () => {
    const result = await checkAccessibilityAids(
      makePageData({ hasSkipLink: false, landmarks: ['nav', 'main'] })
    )
    expect(result.details).toContain('skip navigation')
  })

  it('warns when main landmark is missing but no nav is present', async () => {
    // Has skip link but no main or nav — there's some structure, so warn
    const result = await checkAccessibilityAids(
      makePageData({ hasSkipLink: true, landmarks: ['header', 'footer'] })
    )
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when main is missing (nav present with skip link)', async () => {
    const result = await checkAccessibilityAids(
      makePageData({ hasSkipLink: true, landmarks: ['nav'] })
    )
    expect(result.status).toBe('warn')
    expect(result.details).toContain('main')
  })

  it('includes a recommendation and resources link on fail', async () => {
    const result = await checkAccessibilityAids(
      makePageData({ hasSkipLink: false, landmarks: ['nav', 'main'] })
    )
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })

  it('detects nav via explicit ARIA role landmark', async () => {
    // 'navigation' is the ARIA landmark role name for <nav>
    const result = await checkAccessibilityAids(
      makePageData({ hasSkipLink: false, landmarks: ['navigation', 'main'] })
    )
    expect(result.status).toBe('fail')
  })
})
