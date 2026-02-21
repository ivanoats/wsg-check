import { describe, it, expect } from 'vitest'
import { checkSustainableJs } from '@/checks/sustainable-js'
import type { PageData } from '@/core/types'
import type { ResourceReference } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeScript(url: string): ResourceReference {
  return { type: 'script', url, attributes: { src: url } }
}

function makePageData(
  resources: ResourceReference[],
  body = '<!DOCTYPE html><html><body></body></html>'
): PageData {
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
        script: resources.filter((r) => r.type === 'script').length,
        image: 0,
        font: 0,
        media: 0,
        other: 0,
      },
    },
  } as PageData
}

/** Body with a large inline script (> 2 000 chars). */
const LARGE_INLINE_SCRIPT_BODY = `<!DOCTYPE html><html><head></head><body>
<script>
// Intentionally large inline script
${'const x = 1;\n'.repeat(200)}
</script>
</body></html>`

/** Body with document.write() usage. */
const DOCUMENT_WRITE_BODY = `<!DOCTYPE html><html><head></head><body>
<script>document.write('<p>Hello world</p>');</script>
</body></html>`

/** Body with a small, harmless inline script. */
const SMALL_INLINE_SCRIPT_BODY = `<!DOCTYPE html><html><head></head><body>
<script>console.log('hello');</script>
</body></html>`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkSustainableJs (WSG 3.14)', () => {
  it('returns guidelineId 3.14', async () => {
    const result = await checkSustainableJs(makePageData([]))
    expect(result.guidelineId).toBe('3.14')
  })

  it('returns category web-dev', async () => {
    const result = await checkSustainableJs(makePageData([]))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkSustainableJs(makePageData([]))
    expect(result.machineTestable).toBe(true)
  })

  it('returns not-applicable when there are no scripts', async () => {
    const result = await checkSustainableJs(makePageData([]))
    expect(result.status).toBe('not-applicable')
  })

  it('passes for a reasonable number of external scripts with no anti-patterns', async () => {
    const scripts = Array.from({ length: 3 }, (_, i) =>
      makeScript(`https://example.com/chunk${i}.js`)
    )
    const result = await checkSustainableJs(makePageData(scripts))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when external script count exceeds 9', async () => {
    const scripts = Array.from({ length: 10 }, (_, i) =>
      makeScript(`https://example.com/chunk${i}.js`)
    )
    const result = await checkSustainableJs(makePageData(scripts))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('fails when external script count exceeds 14', async () => {
    const scripts = Array.from({ length: 15 }, (_, i) =>
      makeScript(`https://example.com/chunk${i}.js`)
    )
    const result = await checkSustainableJs(makePageData(scripts))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('fails when document.write() is used in inline scripts', async () => {
    const result = await checkSustainableJs(makePageData([], DOCUMENT_WRITE_BODY))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
    expect(result.details).toContain('document.write')
  })

  it('warns for large inline scripts exceeding the character budget', async () => {
    const result = await checkSustainableJs(makePageData([], LARGE_INLINE_SCRIPT_BODY))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('inline script')
  })

  it('passes with a small inline script', async () => {
    const result = await checkSustainableJs(makePageData([], SMALL_INLINE_SCRIPT_BODY))
    expect(result.status).toBe('pass')
  })

  it('pass message includes the script count', async () => {
    const scripts = [makeScript('https://example.com/app.js')]
    const result = await checkSustainableJs(makePageData(scripts))
    expect(result.message).toContain('1')
  })

  it('includes a recommendation and resources link on warn', async () => {
    const scripts = Array.from({ length: 10 }, (_, i) =>
      makeScript(`https://example.com/chunk${i}.js`)
    )
    const result = await checkSustainableJs(makePageData(scripts))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })

  it('includes a recommendation and resources link on fail', async () => {
    const result = await checkSustainableJs(makePageData([], DOCUMENT_WRITE_BODY))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
