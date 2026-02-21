import { describe, it, expect } from 'vitest'
import { checkWebTypography } from '@/checks/web-typography'
import type { PageData } from '@/core/types'
import type { ResourceReference } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeFont(url: string): ResourceReference {
  return { type: 'font', url, attributes: { href: url, as: 'font' } }
}

function makePageData(opts: { fonts?: ResourceReference[]; body?: string }): PageData {
  const { fonts = [], body } = opts
  const htmlBody = body ?? '<!DOCTYPE html><html><head></head><body></body></html>'
  const resources = [...fonts]
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
}

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
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
