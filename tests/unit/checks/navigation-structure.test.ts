import { describe, it, expect } from 'vitest'
import { checkNavigationStructure } from '@/checks/navigation-structure'
import type { PageData } from '@/core/types'
import type { StructuredData } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(opts: {
  landmarks?: string[]
  structuredData?: StructuredData[]
  body?: string
}): PageData {
  const { landmarks = [], structuredData = [], body } = opts
  const htmlBody = body ?? `<!DOCTYPE html><html><head></head><body></body></html>`
  return {
    url: 'https://example.com',
    fetchResult: {
      url: 'https://example.com',
      originalUrl: 'https://example.com',
      statusCode: 200,
      headers: {},
      body: htmlBody,
      redirectChain: [],
      fromCache: false,
      contentLength: htmlBody.length,
    },
    parsedPage: {
      title: 'Test',
      lang: 'en',
      metaTags: [],
      links: [],
      resources: [],
      headings: [],
      hasSkipLink: false,
      landmarks,
      ariaAttributes: [],
      structuredData,
      doctype: '<!DOCTYPE html>',
      formInputs: [],
    },
    pageWeight: {
      htmlSize: htmlBody.length,
      resourceCount: 0,
      firstPartyCount: 0,
      thirdPartyCount: 0,
      compression: { isCompressed: false },
      byType: { stylesheet: 0, script: 0, image: 0, font: 0, media: 0, other: 0 },
    },
  } as PageData
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkNavigationStructure (WSG 2.8)', () => {
  it('returns guidelineId 2.8', async () => {
    const result = await checkNavigationStructure(makePageData({}))
    expect(result.guidelineId).toBe('2.8')
  })

  it('returns category ux', async () => {
    const result = await checkNavigationStructure(makePageData({}))
    expect(result.category).toBe('ux')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkNavigationStructure(makePageData({}))
    expect(result.machineTestable).toBe(true)
  })

  it('fails when no navigation landmark is present', async () => {
    const result = await checkNavigationStructure(makePageData({ landmarks: [] }))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('warns when nav is present but no breadcrumbs', async () => {
    const result = await checkNavigationStructure(makePageData({ landmarks: ['nav'] }))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('passes when nav is present and breadcrumb aria-label is in the HTML', async () => {
    const body = `<!DOCTYPE html><html><body>
      <nav><ol aria-label="breadcrumb"><li>Home</li></ol></nav>
    </body></html>`
    const result = await checkNavigationStructure(makePageData({ landmarks: ['nav'], body }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes when nav is present and BreadcrumbList structured data exists', async () => {
    const sd: StructuredData[] = [{ type: 'BreadcrumbList', data: { '@type': 'BreadcrumbList' } }]
    const result = await checkNavigationStructure(
      makePageData({ landmarks: ['nav'], structuredData: sd })
    )
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('detects navigation role as equivalent to nav element', async () => {
    const result = await checkNavigationStructure(makePageData({ landmarks: ['navigation'] }))
    // Nav detected (via role="navigation"), breadcrumbs missing → warn
    expect(result.status).toBe('warn')
  })

  it('includes a recommendation and resources link on fail', async () => {
    const result = await checkNavigationStructure(makePageData({ landmarks: [] }))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
