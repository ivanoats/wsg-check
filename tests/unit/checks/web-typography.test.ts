import { describe, it, expect } from 'vitest'
import { checkWebTypography } from '@/checks/web-typography'
import type { PageData } from '@/core/types'
import { expectRecommendationAndResources } from './helpers'
import { parseHtml } from '@/utils/html-parser'
import type { ParsedPage, ResourceReference } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeFont(url: string): ResourceReference {
  return { type: 'font', url, attributes: { href: url, as: 'font' } }
}

function makePageData(opts: {
  fonts?: ResourceReference[]
  body?: string
  resources?: ReadonlyArray<ResourceReference>
  parsedPage?: ParsedPage
}): PageData {
  const { fonts = [], body, resources: extraResources = [], parsedPage } = opts
  const htmlBody = body ?? '<!DOCTYPE html><html><head></head><body></body></html>'
  const resources = [...fonts, ...extraResources]
  const page = {
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
      htmlSize: htmlBody.length,
      resourceCount: resources.length,
      firstPartyCount: resources.length,
      thirdPartyCount: 0,
      compression: { isCompressed: false },
      byType: {
        stylesheet: 0,
        script: 0,
        image: 0,
        font: fonts.length,
        media: 0,
        other: 0,
      },
    },
  } as PageData
  return parsedPage ? { ...page, parsedPage } : page
}

/** A linked external stylesheet, as the parser reports `<link rel="stylesheet">`. */
const STYLESHEET: ResourceReference = {
  type: 'stylesheet',
  url: 'https://example.com/s.css',
  attributes: { rel: 'stylesheet', href: '/s.css' },
}

/** Repro fixture: font discovered via preload, @font-face lives in the linked stylesheet. */
const PRELOADED_FONT_EXTERNAL_CSS_HTML = `<!DOCTYPE html><html lang=en><head><title>t</title>
<link rel="preload" as="font" type="font/woff2" href="/x.woff2" crossorigin>
<link rel="stylesheet" href="/s.css"></head><body><p>x</p></body></html>`

const WITH_FONT_DISPLAY = `<!DOCTYPE html><html><head>
<style>
  @font-face { font-family: "MyFont"; src: url("font.woff2"); font-display: swap; }
</style>
</head><body></body></html>`

const WITHOUT_FONT_DISPLAY = `<!DOCTYPE html><html><head>
<style>
  @font-face { font-family: "MyFont"; src: url("font.woff2"); }
</style>
</head><body></body></html>`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkWebTypography (WSG 2.16)', () => {
  it('returns guidelineId 2.16', async () => {
    const result = await checkWebTypography(makePageData({}))
    expect(result.guidelineId).toBe('2.16')
  })

  it('returns category ux', async () => {
    const result = await checkWebTypography(makePageData({}))
    expect(result.category).toBe('ux')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkWebTypography(makePageData({}))
    expect(result.machineTestable).toBe(true)
  })

  it('returns not-applicable when no font resources are present', async () => {
    const result = await checkWebTypography(makePageData({}))
    expect(result.status).toBe('not-applicable')
  })

  it('fails when fonts are present but none use WOFF2', async () => {
    const result = await checkWebTypography(
      makePageData({
        fonts: [makeFont('https://example.com/font.ttf')],
        body: WITH_FONT_DISPLAY,
      })
    )
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('passes when WOFF2 fonts are used with font-display', async () => {
    const result = await checkWebTypography(
      makePageData({
        fonts: [makeFont('https://example.com/font.woff2')],
        body: WITH_FONT_DISPLAY,
      })
    )
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when WOFF2 is used but font-display is absent from inline CSS', async () => {
    const result = await checkWebTypography(
      makePageData({
        fonts: [makeFont('https://example.com/font.woff2')],
        body: WITHOUT_FONT_DISPLAY,
      })
    )
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when more than 4 font files are declared', async () => {
    const manyFonts = Array.from({ length: 5 }, (_, i) =>
      makeFont(`https://example.com/font-${i}.woff2`)
    )
    const result = await checkWebTypography(
      makePageData({
        fonts: manyFonts,
        body: WITH_FONT_DISPLAY,
      })
    )
    expect(result.status).toBe('warn')
    expect(result.details).toContain('5')
  })

  it('includes a recommendation and resources link on fail', async () => {
    const result = await checkWebTypography(
      makePageData({
        fonts: [makeFont('https://example.com/font.otf')],
        body: WITHOUT_FONT_DISPLAY,
      })
    )
    const firstResource = expectRecommendationAndResources(result)
    expect(firstResource).toContain('w3.org')
  })

  describe('font-display with a linked external stylesheet', () => {
    const woff2 = makeFont('https://example.com/font.woff2')

    it('returns info when no inline @font-face exists and WOFF2/count raise nothing', async () => {
      const result = await checkWebTypography(
        makePageData({ fonts: [woff2], resources: [STYLESHEET] })
      )
      expect(result.status).toBe('info')
      expect(result.score).toBe(0)
      expect(result.message).toContain('font-display could not be checked')
      expect(result.details).toContain('not verifiable')
      expect(result.machineTestable).toBe(true)
    })

    it('info message counts all font files, not only the WOFF2 ones', async () => {
      const fonts = [
        woff2,
        makeFont('https://example.com/a.ttf'),
        makeFont('https://example.com/b.ttf'),
      ]
      const result = await checkWebTypography(makePageData({ fonts, resources: [STYLESHEET] }))
      expect(result.status).toBe('info')
      expect(result.message).toContain('3 font file(s) found (1 WOFF2)')
    })

    it('returns info when the only external CSS is an inline @import', async () => {
      const body =
        '<!DOCTYPE html><html><head><style>@import url("/fonts.css");</style></head><body></body></html>'
      const result = await checkWebTypography(makePageData({ fonts: [woff2], body }))
      expect(result.status).toBe('info')
      expect(result.details).toContain('not verifiable')
    })

    it('ignores a commented-out @import, so no external CSS is assumed', async () => {
      const body =
        '<!DOCTYPE html><html><head><style>/* @import url("/fonts.css"); */</style></head><body></body></html>'
      const result = await checkWebTypography(makePageData({ fonts: [woff2], body }))
      expect(result.status).toBe('warn')
      expect(result.details).toContain('No font-display descriptor')
    })

    it('does not credit a commented-out font-display descriptor', async () => {
      const body = `<!DOCTYPE html><html><head><style>
@font-face { font-family: "MyFont"; src: url("font.woff2"); /* font-display: swap; */ }
</style></head><body></body></html>`
      const result = await checkWebTypography(makePageData({ fonts: [woff2], body }))
      expect(result.status).toBe('warn')
      expect(result.details).toContain('No font-display descriptor')
    })

    it('info result still carries a recommendation and resources', async () => {
      const result = await checkWebTypography(
        makePageData({ fonts: [woff2], resources: [STYLESHEET] })
      )
      const firstResource = expectRecommendationAndResources(result)
      expect(firstResource).toContain('w3.org')
    })

    it('still fails on non-WOFF2 fonts, with the not-verifiable note in details', async () => {
      const result = await checkWebTypography(
        makePageData({ fonts: [makeFont('https://example.com/font.ttf')], resources: [STYLESHEET] })
      )
      expect(result.status).toBe('fail')
      expect(result.details).toContain('WOFF2')
      expect(result.details).toContain('not verifiable')
      expect(result.details).not.toContain('No font-display descriptor')
    })

    it('still warns on too many font files, with the not-verifiable note in details', async () => {
      const manyFonts = Array.from({ length: 5 }, (_, i) =>
        makeFont(`https://example.com/font-${i}.woff2`)
      )
      const result = await checkWebTypography(
        makePageData({ fonts: manyFonts, resources: [STYLESHEET] })
      )
      expect(result.status).toBe('warn')
      expect(result.details).toContain('5')
      expect(result.details).toContain('not verifiable')
    })

    it('still warns when an inline @font-face lacks font-display', async () => {
      const result = await checkWebTypography(
        makePageData({ fonts: [woff2], body: WITHOUT_FONT_DISPLAY, resources: [STYLESHEET] })
      )
      expect(result.status).toBe('warn')
      expect(result.details).toContain('No font-display descriptor')
    })

    it('still warns when no stylesheet is linked and no inline @font-face exists', async () => {
      const result = await checkWebTypography(makePageData({ fonts: [woff2] }))
      expect(result.status).toBe('warn')
      expect(result.details).toContain('No font-display descriptor')
    })

    it('returns info for a parsed document with a preloaded WOFF2 and a linked stylesheet', async () => {
      const parsed = parseHtml(PRELOADED_FONT_EXTERNAL_CSS_HTML, 'https://example.com')
      const result = await checkWebTypography(
        makePageData({ body: PRELOADED_FONT_EXTERNAL_CSS_HTML, parsedPage: parsed })
      )
      expect(result.status).toBe('info')
    })
  })
})
