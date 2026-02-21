import { describe, it, expect } from 'vitest'
import { checkMinification } from '@/checks/minification'
import type { PageData } from '@/core/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Build a minimal PageData stub with a configurable HTML body. */
function makePageData(body: string): PageData {
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

/** Well-minified HTML (single line, no blank lines, no comments). */
const MINIFIED_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Test</title></head><body><h1>Hello</h1></body></html>`

/** Unminified HTML with >10% blank lines. */
const UNMINIFIED_BLANK_LINES = `<!DOCTYPE html>
<html lang="en">

<head>

  <meta charset="UTF-8">

  <title>Test</title>

</head>

<body>

  <h1>Hello World</h1>

</body>

</html>
`

/** Unminified HTML with many HTML comments. */
const UNMINIFIED_WITH_COMMENTS = `<!DOCTYPE html>
<html>
<head>
<!-- Meta section -->
<!-- Author: Developer -->
<!-- Version: 1.0 -->
<!-- Build: production -->
<title>Test</title>
</head>
<body>
<h1>Hello</h1>
</body>
</html>`

/** HTML with only conditional comments (should not trigger the check). */
const CONDITIONAL_COMMENTS_ONLY = `<!DOCTYPE html><html><head><!--[if lt IE 9]><script src="ie.js"></script><![endif]--><title>Test</title></head><body><p>Content</p></body></html>`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkMinification (WSG 3.3)', () => {
  it('returns guidelineId 3.3', async () => {
    const result = await checkMinification(makePageData(MINIFIED_HTML))
    expect(result.guidelineId).toBe('3.3')
  })

  it('returns category web-dev', async () => {
    const result = await checkMinification(makePageData(MINIFIED_HTML))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkMinification(makePageData(MINIFIED_HTML))
    expect(result.machineTestable).toBe(true)
  })

  it('passes for well-minified HTML (single line, no comments)', async () => {
    const result = await checkMinification(makePageData(MINIFIED_HTML))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns for HTML with a high blank-line ratio', async () => {
    const result = await checkMinification(makePageData(UNMINIFIED_BLANK_LINES))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
    expect(result.details).toContain('blank')
  })

  it('warns for HTML with many HTML comments', async () => {
    const result = await checkMinification(makePageData(UNMINIFIED_WITH_COMMENTS))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
    expect(result.details).toContain('comment')
  })

  it('does not warn for conditional IE comments alone', async () => {
    const result = await checkMinification(makePageData(CONDITIONAL_COMMENTS_ONLY))
    expect(result.status).toBe('pass')
  })

  it('includes a recommendation and resources link on warn', async () => {
    const result = await checkMinification(makePageData(UNMINIFIED_BLANK_LINES))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })

  it('passes for an empty HTML body (no blank lines)', async () => {
    const result = await checkMinification(makePageData(''))
    expect(result.status).toBe('pass')
  })

  it('passes for HTML with exactly 2 non-conditional comments (threshold is > 2)', async () => {
    const body = `<!DOCTYPE html><html><head><!-- a --><!-- b --><title>T</title></head><body></body></html>`
    const result = await checkMinification(makePageData(body))
    expect(result.status).toBe('pass')
  })

  it('warns for HTML with 3 or more non-conditional comments', async () => {
    const body = `<!DOCTYPE html>\n<html>\n<head><!-- a --><!-- b --><!-- c -->\n<title>T</title>\n</head>\n<body>\n</body>\n</html>`
    const result = await checkMinification(makePageData(body))
    // Either blank lines or comment count could trigger the warn
    expect(result.status).toBe('warn')
  })
})
