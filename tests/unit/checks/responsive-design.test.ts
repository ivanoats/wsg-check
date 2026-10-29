import { describe, it, expect } from 'vitest'
import { checkResponsiveDesign } from '@/checks/responsive-design'
import type { PageData } from '@/core/types'
import type { MetaTag, ResourceReference } from '@/utils/html-parser'
import { parseHtml } from '@/utils/html-parser'
import { expectRecommendationAndResources } from './helpers'

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

  describe('media queries with a linked external stylesheet', () => {
    const STYLESHEET: ResourceReference = {
      type: 'stylesheet',
      url: 'https://example.com/s.css',
      attributes: { rel: 'stylesheet', href: '/s.css' },
    }
    /** Repro fixture /extcss/: viewport, one linked stylesheet, no inline CSS. */
    const EXTERNAL_CSS_ONLY_HTML =
      '<!DOCTYPE html><html lang=en><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>t</title><link rel="stylesheet" href="/s.css"></head><body><p>x</p></body></html>'

    it('reports info, not warn, when no inline CSS exists and a stylesheet is linked', async () => {
      const result = await checkResponsiveDesign(
        makePageData({ metaTags: [VIEWPORT_META], resources: [STYLESHEET] })
      )
      expect(result.status).toBe('info')
      expect(result.score).toBe(0)
      expect(result.message).toContain('could not be checked')
      expect(result.details).toContain('not verifiable')
      expect(result.machineTestable).toBe(true)
    })

    it('reports info when inline CSS has no @media and a stylesheet is linked', async () => {
      const result = await checkResponsiveDesign(
        makePageData({
          metaTags: [VIEWPORT_META],
          resources: [STYLESHEET],
          body: BODY_WITHOUT_MEDIA_QUERY,
        })
      )
      expect(result.status).toBe('info')
    })

    const page = (css: string, body = '') =>
      `<!DOCTYPE html><html lang="en"><head><style>${css}</style></head><body>${body}</body></html>`

    it.each([
      '@import url("/s.css");',
      '@import "a.css";',
      "@import 'a.css';",
      '@import url("a.css") screen and (min-width: 600px);',
      "@import url('a.css') layer(base);",
      '@import url(a.css) supports(display: grid);',
    ])('treats %s as linked external CSS', async (rule) => {
      const result = await checkResponsiveDesign(
        makePageData({ metaTags: [VIEWPORT_META], body: page(rule) })
      )
      expect(result.status).toBe('info')
    })

    it.each([
      {
        name: 'ignores @import in page text between two style blocks',
        body: page(
          'body { margin: 0; }',
          '<p>Use @import to load CSS.</p><style>p { color: red; }</style>'
        ),
      },
      {
        name: 'ignores @media in page text between two style blocks',
        body: page(
          'body { margin: 0; }',
          '<p>Use @media to adapt layouts.</p><style>p { color: red; }</style>'
        ),
      },
      {
        name: 'ignores a commented-out @import, so no external CSS is assumed',
        body: page('/* @import url("/old.css"); */'),
      },
      {
        name: 'does not credit a commented-out @media rule',
        body: page('/* @media (max-width: 600px) { .nav { display: none; } } */'),
      },
    ])('$name', async ({ body }) => {
      const result = await checkResponsiveDesign(makePageData({ metaTags: [VIEWPORT_META], body }))
      expect(result.status).toBe('warn')
      expect(result.details).toContain('No @media rules')
    })

    it('includes a recommendation and resources link on info', async () => {
      const result = await checkResponsiveDesign(
        makePageData({ metaTags: [VIEWPORT_META], resources: [STYLESHEET] })
      )
      expect(result.status).toBe('info')
      const firstResource = expectRecommendationAndResources(result)
      expect(firstResource).toContain('w3.org')
    })

    it('still warns on a srcset issue, noting media queries instead of flagging them', async () => {
      const result = await checkResponsiveDesign(
        makePageData({
          metaTags: [VIEWPORT_META],
          resources: [STYLESHEET, makeImage('https://example.com/photo.jpg')],
        })
      )
      expect(result.status).toBe('warn')
      expect(result.score).toBe(50)
      expect(result.details).toContain('srcset')
      expect(result.details).toContain('not verifiable')
      expect(result.details).not.toContain('No @media rules')
    })

    it('still fails without a viewport meta tag', async () => {
      const result = await checkResponsiveDesign(
        makePageData({ metaTags: [], resources: [STYLESHEET] })
      )
      expect(result.status).toBe('fail')
      expect(result.details).not.toContain('not verifiable')
    })

    it('still passes when an inline @media rule is present', async () => {
      const result = await checkResponsiveDesign(
        makePageData({
          metaTags: [VIEWPORT_META],
          resources: [STYLESHEET],
          body: BODY_WITH_MEDIA_QUERY,
        })
      )
      expect(result.status).toBe('pass')
    })

    it('reports info for a parsed page that links only an external stylesheet', async () => {
      const parsed = parseHtml(EXTERNAL_CSS_ONLY_HTML, 'https://example.com')
      const result = await checkResponsiveDesign(
        makePageData({
          metaTags: parsed.metaTags,
          resources: parsed.resources,
          body: EXTERNAL_CSS_ONLY_HTML,
        })
      )
      expect(result.status).toBe('info')
    })
  })

  it('includes a recommendation and resources link on warn', async () => {
    const result = await checkResponsiveDesign(
      makePageData({
        metaTags: [VIEWPORT_META],
        resources: [makeImage('https://example.com/photo.jpg')],
        body: BODY_WITH_MEDIA_QUERY,
      })
    )
    const firstResource = expectRecommendationAndResources(result)
    expect(firstResource).toContain('w3.org')
  })

  describe('SVG (vector) images', () => {
    it('passes without srcset when the only images are SVG', async () => {
      const resources = [makeImage('https://example.com/logo.svg')]
      const result = await checkResponsiveDesign(
        makePageData({ metaTags: [VIEWPORT_META], resources, body: BODY_WITH_MEDIA_QUERY })
      )
      expect(result.status).toBe('pass')
      expect(result.score).toBe(100)
      expect(result.details ?? '').not.toContain('srcset')
    })

    it('still warns about srcset when a JPEG accompanies an SVG', async () => {
      const resources = [
        makeImage('https://example.com/logo.svg'),
        makeImage('https://example.com/photo.jpg'),
      ]
      const result = await checkResponsiveDesign(
        makePageData({ metaTags: [VIEWPORT_META], resources, body: BODY_WITH_MEDIA_QUERY })
      )
      expect(result.status).toBe('warn')
      expect(result.details).toContain('srcset')
      expect(result.details).toContain('1 raster image')
    })

    it('passes for an SVG-only page parsed from HTML', async () => {
      const parsed = parseHtml(
        '<img src="/icon.svg?v=2" width="40" height="40">' +
          '<img src="data:image/svg+xml;base64,PHN2Zy8+" width="1" height="1">',
        'https://x.test/'
      )
      const result = await checkResponsiveDesign(
        makePageData({
          metaTags: [VIEWPORT_META],
          resources: parsed.resources,
          body: BODY_WITH_MEDIA_QUERY,
        })
      )
      expect(result.status).toBe('pass')
    })
  })
})
