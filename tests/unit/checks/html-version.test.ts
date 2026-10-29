import { describe, it, expect } from 'vitest'
import { checkHtmlVersion } from '@/checks/html-version'
import type { PageData } from '@/core/types'
import { parseHtml } from '@/utils/html-parser'
import { expectRecommendationAndResources } from './helpers'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(opts: { doctype?: string | null; body?: string } = {}): PageData {
  const {
    doctype = '<!DOCTYPE html>',
    body = '<!DOCTYPE html><html lang="en"><head></head><body><main></main></body></html>',
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
      metaTags: [],
      links: [],
      resources: [],
      headings: [],
      hasSkipLink: false,
      landmarks: ['main'],
      ariaAttributes: [],
      structuredData: [],
      doctype,
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

describe('checkHtmlVersion (WSG 3.19)', () => {
  it('returns guidelineId 3.19', async () => {
    const result = await checkHtmlVersion(makePageData())
    expect(result.guidelineId).toBe('3.19')
  })

  it('returns category web-dev', async () => {
    const result = await checkHtmlVersion(makePageData())
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkHtmlVersion(makePageData())
    expect(result.machineTestable).toBe(true)
  })

  it('passes for a modern HTML5 document', async () => {
    const result = await checkHtmlVersion(makePageData())
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('is case-insensitive for the HTML5 doctype', async () => {
    const result = await checkHtmlVersion(
      makePageData({ doctype: '<!DOCTYPE HTML>', body: '<!DOCTYPE HTML><html lang="en"></html>' })
    )
    expect(result.status).toBe('pass')
  })

  it('warns when there is no DOCTYPE', async () => {
    const result = await checkHtmlVersion(makePageData({ doctype: null }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('DOCTYPE')
  })

  it('warns for a legacy HTML4 DOCTYPE', async () => {
    const legacyDoctype =
      '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">'
    const result = await checkHtmlVersion(makePageData({ doctype: legacyDoctype }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('Non-HTML5')
  })

  it('warns for an XHTML DOCTYPE', async () => {
    const xhtmlDoctype =
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">'
    const result = await checkHtmlVersion(makePageData({ doctype: xhtmlDoctype }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('Non-HTML5')
  })

  // These run the real parser; the tests above hand-build `doctype`.
  it('passes for a real parsed HTML5 document (round-trip through parseHtml)', async () => {
    const html =
      '<!DOCTYPE html><html lang="en"><head><title>t</title></head><body><main></main></body></html>'
    const page = makePageData({ body: html })
    const result = await checkHtmlVersion({ ...page, parsedPage: parseHtml(html) })
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns for a real parsed legacy HTML 4.01 document and quotes the doctype once', async () => {
    const html =
      '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd"><html lang="en"><head><title>t</title></head><body></body></html>'
    const page = makePageData({ body: html })
    const result = await checkHtmlVersion({ ...page, parsedPage: parseHtml(html) })
    expect(result.status).toBe('warn')
    // parse5 normalizes the root element name to lower case.
    expect(result.details).toContain(
      '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"'
    )
    expect(result.details).not.toContain('<!!')
  })

  it.each([
    ['<font>', '<font color="red">text</font>'],
    ['<center>', '<center>centered</center>'],
    ['<marquee>', '<marquee>scroll</marquee>'],
  ])('warns when a deprecated %s element is found in the body', async (tag, markup) => {
    const body = `<!DOCTYPE html><html lang="en"><body>${markup}</body></html>`
    const result = await checkHtmlVersion(makePageData({ body }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain(tag)
  })

  it('includes a recommendation and resources link on warn', async () => {
    const result = await checkHtmlVersion(makePageData({ doctype: null }))
    const firstResource = expectRecommendationAndResources(result)
    expect(firstResource).toContain('w3.org')
  })
})
