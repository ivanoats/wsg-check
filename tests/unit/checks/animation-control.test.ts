import { describe, it, expect } from 'vitest'
import { checkAnimationControl } from '@/checks/animation-control'
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

const NO_ANIMATION_BODY = '<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>'

const ANIMATION_NO_GUARD = `<!DOCTYPE html><html><head>
<style>
  @keyframes slide { from { left: 0 } to { left: 100px } }
  .box { animation: slide 1s infinite; }
</style>
</head><body></body></html>`

const ANIMATION_WITH_GUARD = `<!DOCTYPE html><html><head>
<style>
  @keyframes slide { from { left: 0 } to { left: 100px } }
  @media (prefers-reduced-motion: no-preference) {
    .box { animation: slide 1s infinite; }
  }
</style>
</head><body></body></html>`

const TRANSITION_NO_GUARD = `<!DOCTYPE html><html><head>
<style>
  .btn { transition: background 0.3s ease; }
</style>
</head><body></body></html>`

const TRANSITION_WITH_GUARD = `<!DOCTYPE html><html><head>
<style>
  @media (prefers-reduced-motion: no-preference) {
    .btn { transition: background 0.3s ease; }
  }
</style>
</head><body></body></html>`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkAnimationControl (WSG 2.15)', () => {
  it('returns guidelineId 2.15', async () => {
    const result = await checkAnimationControl(makePageData(NO_ANIMATION_BODY))
    expect(result.guidelineId).toBe('2.15')
  })

  it('returns category ux', async () => {
    const result = await checkAnimationControl(makePageData(NO_ANIMATION_BODY))
    expect(result.category).toBe('ux')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkAnimationControl(makePageData(NO_ANIMATION_BODY))
    expect(result.machineTestable).toBe(true)
  })

  it('returns not-applicable when no CSS animations are detected', async () => {
    const result = await checkAnimationControl(makePageData(NO_ANIMATION_BODY))
    expect(result.status).toBe('not-applicable')
  })

  it('fails when @keyframes are present without prefers-reduced-motion guard', async () => {
    const result = await checkAnimationControl(makePageData(ANIMATION_NO_GUARD))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('passes when @keyframes are guarded by prefers-reduced-motion', async () => {
    const result = await checkAnimationControl(makePageData(ANIMATION_WITH_GUARD))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('fails when transition: is present without prefers-reduced-motion guard', async () => {
    const result = await checkAnimationControl(makePageData(TRANSITION_NO_GUARD))
    expect(result.status).toBe('fail')
  })

  it('passes when transition: is guarded by prefers-reduced-motion', async () => {
    const result = await checkAnimationControl(makePageData(TRANSITION_WITH_GUARD))
    expect(result.status).toBe('pass')
  })

  it('fail result details mention prefers-reduced-motion', async () => {
    const result = await checkAnimationControl(makePageData(ANIMATION_NO_GUARD))
    expect(result.details).toContain('prefers-reduced-motion')
  })

  it('includes a recommendation and resources link on fail', async () => {
    const result = await checkAnimationControl(makePageData(ANIMATION_NO_GUARD))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
