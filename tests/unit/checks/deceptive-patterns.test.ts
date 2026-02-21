import { describe, it, expect } from 'vitest'
import { checkDeceptivePatterns } from '@/checks/deceptive-patterns'
import type { PageData } from '@/core/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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

const CLEAN_BODY = '<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>'
const HIDDEN_CLOSE_BODY =
  '<!DOCTYPE html><html><body><button class="close" style="display:none">X</button></body></html>'
const HIDDEN_CLOSE_VISIBILITY_BODY =
  '<!DOCTYPE html><html><body><span class="close" style="visibility:hidden">×</span></body></html>'
const COUNTDOWN_BODY = '<!DOCTYPE html><html><body><div class="countdown">10:00</div></body></html>'
const TIMER_BODY = '<!DOCTYPE html><html><body><div class="timer">05:00</div></body></html>'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkDeceptivePatterns (WSG 2.10)', () => {
  it('returns guidelineId 2.10', async () => {
    const result = await checkDeceptivePatterns(makePageData(CLEAN_BODY))
    expect(result.guidelineId).toBe('2.10')
  })

  it('returns category ux', async () => {
    const result = await checkDeceptivePatterns(makePageData(CLEAN_BODY))
    expect(result.category).toBe('ux')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkDeceptivePatterns(makePageData(CLEAN_BODY))
    expect(result.machineTestable).toBe(true)
  })

  it('passes when no dark pattern indicators are present', async () => {
    const result = await checkDeceptivePatterns(makePageData(CLEAN_BODY))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when a hidden close button (display:none) is detected', async () => {
    const result = await checkDeceptivePatterns(makePageData(HIDDEN_CLOSE_BODY))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when a hidden close button (visibility:hidden) is detected', async () => {
    const result = await checkDeceptivePatterns(makePageData(HIDDEN_CLOSE_VISIBILITY_BODY))
    expect(result.status).toBe('warn')
  })

  it('warns when a countdown element is detected', async () => {
    const result = await checkDeceptivePatterns(makePageData(COUNTDOWN_BODY))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when a timer element is detected', async () => {
    const result = await checkDeceptivePatterns(makePageData(TIMER_BODY))
    expect(result.status).toBe('warn')
  })

  it('warn result mentions both issues when both are present', async () => {
    const bothBody = HIDDEN_CLOSE_BODY.replace(
      '</body>',
      '<div class="countdown">5:00</div></body>'
    )
    const result = await checkDeceptivePatterns(makePageData(bothBody))
    expect(result.message).toContain('2')
  })

  it('includes a recommendation and resources link on warn', async () => {
    const result = await checkDeceptivePatterns(makePageData(COUNTDOWN_BODY))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
