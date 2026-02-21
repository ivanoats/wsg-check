import { describe, it, expect } from 'vitest'
import { checkMetadata, checkStructuredData } from '@/checks/metadata'
import type { PageData } from '@/core/types'
import type { MetaTag, StructuredData } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(opts: {
  title?: string | null
  metaTags?: MetaTag[]
  structuredData?: StructuredData[]
}): PageData {
  const { title = 'Test Page', metaTags = [], structuredData = [] } = opts
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
      title,
      lang: 'en',
      metaTags,
      links: [],
      resources: [],
      headings: [],
      hasSkipLink: false,
      landmarks: [],
      ariaAttributes: [],
      structuredData,
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

const FULL_META_TAGS: MetaTag[] = [
  { name: 'description', content: 'A test description' },
  { property: 'og:title', content: 'Test Page' },
  { property: 'og:description', content: 'A test description' },
]

// ─── checkMetadata (WSG 3.4) ──────────────────────────────────────────────────

describe('checkMetadata (WSG 3.4)', () => {
  it('returns guidelineId 3.4', async () => {
    const result = await checkMetadata(makePageData({ metaTags: FULL_META_TAGS }))
    expect(result.guidelineId).toBe('3.4')
  })

  it('returns category web-dev', async () => {
    const result = await checkMetadata(makePageData({ metaTags: FULL_META_TAGS }))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkMetadata(makePageData({ metaTags: FULL_META_TAGS }))
    expect(result.machineTestable).toBe(true)
  })

  it('passes when title, description, and Open Graph tags are present', async () => {
    const result = await checkMetadata(makePageData({ metaTags: FULL_META_TAGS }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('fails when the title is missing', async () => {
    const result = await checkMetadata(makePageData({ title: null, metaTags: FULL_META_TAGS }))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
    expect(result.details).toContain('title')
  })

  it('fails when meta description is missing', async () => {
    const result = await checkMetadata(
      makePageData({
        metaTags: [
          { property: 'og:title', content: 'Test' },
          { property: 'og:description', content: 'Desc' },
        ],
      })
    )
    expect(result.status).toBe('fail')
    expect(result.details).toContain('description')
  })

  it('warns when only Open Graph tags are missing (title and description present)', async () => {
    const result = await checkMetadata(
      makePageData({ metaTags: [{ name: 'description', content: 'A description' }] })
    )
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
    expect(result.details).toContain('og:')
  })

  it('fails when title is missing and description is also missing', async () => {
    const result = await checkMetadata(makePageData({ title: null, metaTags: [] }))
    expect(result.status).toBe('fail')
  })

  it('includes a recommendation and resources link on fail', async () => {
    const result = await checkMetadata(makePageData({ title: null }))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })

  it('treats meta description with empty content as missing', async () => {
    const result = await checkMetadata(
      makePageData({
        metaTags: [
          { name: 'description', content: '   ' },
          { property: 'og:title', content: 'T' },
          { property: 'og:description', content: 'D' },
        ],
      })
    )
    // Empty-trimmed content should still fail description check
    expect(result.status).toBe('fail')
  })
})

// ─── checkStructuredData (WSG 3.13) ──────────────────────────────────────────

describe('checkStructuredData (WSG 3.13)', () => {
  it('returns guidelineId 3.13', async () => {
    const result = await checkStructuredData(makePageData({}))
    expect(result.guidelineId).toBe('3.13')
  })

  it('returns category web-dev', async () => {
    const result = await checkStructuredData(makePageData({}))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkStructuredData(makePageData({}))
    expect(result.machineTestable).toBe(true)
  })

  it('warns when no structured data is present', async () => {
    const result = await checkStructuredData(makePageData({ structuredData: [] }))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('passes when JSON-LD structured data is present', async () => {
    const sd: StructuredData[] = [{ type: 'WebPage', data: { '@type': 'WebPage', name: 'Test' } }]
    const result = await checkStructuredData(makePageData({ structuredData: sd }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('pass message includes the @type of the structured data block', async () => {
    const sd: StructuredData[] = [
      { type: 'Article', data: { '@type': 'Article', headline: 'Hello' } },
    ]
    const result = await checkStructuredData(makePageData({ structuredData: sd }))
    expect(result.message).toContain('Article')
  })

  it('pass message includes the count of structured data blocks', async () => {
    const sd: StructuredData[] = [
      { type: 'WebPage', data: {} },
      { type: 'BreadcrumbList', data: {} },
    ]
    const result = await checkStructuredData(makePageData({ structuredData: sd }))
    expect(result.message).toContain('2')
  })

  it('warn result includes a recommendation with resources link', async () => {
    const result = await checkStructuredData(makePageData({}))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
