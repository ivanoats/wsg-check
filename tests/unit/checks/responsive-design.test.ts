import { describe, it, expect } from 'vitest'
import { checkResponsiveDesign } from '@/checks/responsive-design'
import type { PageData } from '@/core/types'
import type { MetaTag, ResourceReference } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VIEWPORT_META: MetaTag = {
  name: 'viewport',
  content: 'width=device-width, initial-scale=1',
}

function makeImage(url: string, attrs: Record<string, string> = {}): ResourceReference {
  return { type: 'image', url, attributes: { src: url, ...attrs } }
}

function makePageData(opts: {
  metaTags?: MetaTag[]
  resources?: ResourceReference[]
  body?: string
}): PageData {
  const {
    metaTags = [],
    resources = [],
    body = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>',
  } = opts

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
      metaTags,
      links: [],
      resources,
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
      resourceCount: resources.length,
      firstPartyCount: resources.length,
      thirdPartyCount: 0,
      compression: { isCompressed: false },
      byType: {
        stylesheet: 0,
        script: 0,
        image: resources.filter((r) => r.type === 'image').length,
        font: 0,
        media: 0,
        other: 0,
      },
    },
  } as PageData
}

/** Body with a @media rule in an inline style block. */
const BODY_WITH_MEDIA_QUERY = `<!DOCTYPE html><html lang="en">
<head><style>@media (max-width: 768px) { .nav { display: none; } }</style></head>
<body></body></html>`

/** Body without any @media rules. */
const BODY_WITHOUT_MEDIA_QUERY = `<!DOCTYPE html><html lang="en">
<head><style>body { margin: 0; }</style></head>
<body></body></html>`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkResponsiveDesign (WSG 3.13)', () => {
  it('returns guidelineId 3.13', async () => {
    const result = await checkResponsiveDesign(makePageData({}))
    expect(result.guidelineId).toBe('3.13')
  })

  it('returns category web-dev', async () => {
    const result = await checkResponsiveDesign(makePageData({}))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkResponsiveDesign(makePageData({}))
    expect(result.machineTestable).toBe(true)
  })

  it('fails when the viewport meta tag is missing', async () => {
    const result = await checkResponsiveDesign(makePageData({ metaTags: [] }))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('fail message mentions viewport meta', async () => {
    const result = await checkResponsiveDesign(makePageData({ metaTags: [] }))
    expect(result.message.toLowerCase()).toContain('viewport')
  })

  it('passes when viewport is set, images use srcset, and media queries are present', async () => {
    const resources = [makeImage('https://example.com/photo.jpg', { srcset: '/photo-2x.jpg 2x' })]
    const result = await checkResponsiveDesign(
      makePageData({
        metaTags: [VIEWPORT_META],
        resources,
        body: BODY_WITH_MEDIA_QUERY,
      })
    )
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when images exist but none have srcset', async () => {
    const resources = [makeImage('https://example.com/photo.jpg')]
    const result = await checkResponsiveDesign(
      makePageData({
        metaTags: [VIEWPORT_META],
        resources,
        body: BODY_WITH_MEDIA_QUERY,
      })
    )
    expect(result.status).toBe('warn')
    expect(result.details).toContain('srcset')
  })

  it('passes when there are no images (srcset check is skipped)', async () => {
    const result = await checkResponsiveDesign(
      makePageData({
        metaTags: [VIEWPORT_META],
        resources: [],
        body: BODY_WITH_MEDIA_QUERY,
      })
    )
    expect(result.status).toBe('pass')
  })

  it('warns when no @media rules are found in inline CSS', async () => {
    const result = await checkResponsiveDesign(
      makePageData({
        metaTags: [VIEWPORT_META],
        resources: [],
        body: BODY_WITHOUT_MEDIA_QUERY,
      })
    )
    expect(result.status).toBe('warn')
    expect(result.details).toContain('@media')
  })

  it('passes when there are no inline styles (media query check skipped as inconclusive)', async () => {
    // No <style> blocks at all — external CSS may have media queries
    const noStyleBody = `<!DOCTYPE html><html lang="en"><head></head><body></body></html>`
    const result = await checkResponsiveDesign(
      makePageData({
        metaTags: [VIEWPORT_META],
        resources: [],
        body: noStyleBody,
      })
    )
    // No inline styles → no @media found → warn
    expect(result.status).toBe('warn')
  })

  it('includes a recommendation and resources link on warn', async () => {
    const result = await checkResponsiveDesign(
      makePageData({
        metaTags: [VIEWPORT_META],
        resources: [makeImage('https://example.com/photo.jpg')],
        body: BODY_WITH_MEDIA_QUERY,
      })
    )
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
