import { describe, it, expect } from 'vitest'
import { checkSemanticHtml } from '@/checks/semantic-html'
import type { PageData } from '@/core/types'
import type { HeadingNode } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(
  opts: {
    headings?: HeadingNode[]
    lang?: string | null
    landmarks?: string[]
    body?: string
  } = {}
): PageData {
  const {
    headings = [],
    lang = 'en',
    landmarks = ['main', 'nav', 'header', 'footer'],
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
      lang,
      metaTags: [],
      links: [],
      resources: [],
      headings,
      hasSkipLink: true,
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

const GOOD_HEADINGS: HeadingNode[] = [
  { level: 1, text: 'Main Title' },
  { level: 2, text: 'Section A' },
  { level: 3, text: 'Sub-section' },
  { level: 2, text: 'Section B' },
]

const SKIPPED_HEADING_HTML =
  '<!DOCTYPE html><html lang="en"><body><h1>Title</h1><h3>Skip</h3></body></html>'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkSemanticHtml (WSG 3.7)', () => {
  it('returns guidelineId 3.7', async () => {
    const result = await checkSemanticHtml(makePageData({ headings: GOOD_HEADINGS }))
    expect(result.guidelineId).toBe('3.7')
  })

  it('returns category web-dev', async () => {
    const result = await checkSemanticHtml(makePageData({ headings: GOOD_HEADINGS }))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkSemanticHtml(makePageData({ headings: GOOD_HEADINGS }))
    expect(result.machineTestable).toBe(true)
  })

  it('passes for a fully correct semantic structure', async () => {
    const result = await checkSemanticHtml(makePageData({ headings: GOOD_HEADINGS }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when the html lang attribute is missing', async () => {
    const result = await checkSemanticHtml(makePageData({ lang: null }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('lang')
  })

  it('warns when there is no h1 element (but there are other headings)', async () => {
    const headings: HeadingNode[] = [
      { level: 2, text: 'Section' },
      { level: 3, text: 'Sub' },
    ]
    const result = await checkSemanticHtml(makePageData({ headings }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('h1')
  })

  it('warns when there are multiple h1 elements', async () => {
    const headings: HeadingNode[] = [
      { level: 1, text: 'First' },
      { level: 1, text: 'Second' },
    ]
    const result = await checkSemanticHtml(makePageData({ headings }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('h1')
  })

  it('warns when heading levels are skipped', async () => {
    const headings: HeadingNode[] = [
      { level: 1, text: 'Title' },
      { level: 3, text: 'Skipped h2' },
    ]
    const result = await checkSemanticHtml(makePageData({ headings, body: SKIPPED_HEADING_HTML }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('h1 → h3')
  })

  it('does not warn about heading skips when page has no headings', async () => {
    const result = await checkSemanticHtml(makePageData({ headings: [] }))
    // Only potential issues are lang + main (both provided), so should pass
    expect(result.status).toBe('pass')
  })

  it('warns when there is no <main> landmark', async () => {
    const result = await checkSemanticHtml(
      makePageData({ headings: GOOD_HEADINGS, landmarks: ['nav', 'header', 'footer'] })
    )
    expect(result.status).toBe('warn')
    expect(result.details).toContain('main')
  })

  it('warns when custom native element patterns are found in the body', async () => {
    const body = `<!DOCTYPE html><html lang="en"><body><main><div role="button">Click</div></main></body></html>`
    const result = await checkSemanticHtml(makePageData({ headings: GOOD_HEADINGS, body }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('custom implementation')
  })

  it('detects multiple custom native patterns', async () => {
    const body = `<html lang="en"><body><main>
      <div role="button">A</div>
      <span role="checkbox"></span>
      <div role="link">B</div>
    </main></body></html>`
    const result = await checkSemanticHtml(makePageData({ headings: GOOD_HEADINGS, body }))
    expect(result.details).toContain('3')
  })

  it('includes a recommendation on warn', async () => {
    const result = await checkSemanticHtml(makePageData({ lang: null }))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
