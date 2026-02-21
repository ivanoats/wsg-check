import { describe, it, expect } from 'vitest'
import { checkNonEssentialContent } from '@/checks/non-essential-content'
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
const AUTOPLAY_VIDEO =
  '<!DOCTYPE html><html><body><video autoplay src="v.mp4"></video></body></html>'
const AUTOPLAY_AUDIO =
  '<!DOCTYPE html><html><body><audio autoplay src="a.mp3"></audio></body></html>'
const MODAL_BODY = '<!DOCTYPE html><html><body><div class="modal">...</div></body></html>'
const POPUP_BODY = '<!DOCTYPE html><html><body><div class="popup">...</div></body></html>'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkNonEssentialContent (WSG 2.9)', () => {
  it('returns guidelineId 2.9', async () => {
    const result = await checkNonEssentialContent(makePageData(CLEAN_BODY))
    expect(result.guidelineId).toBe('2.9')
  })

  it('returns category ux', async () => {
    const result = await checkNonEssentialContent(makePageData(CLEAN_BODY))
    expect(result.category).toBe('ux')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkNonEssentialContent(makePageData(CLEAN_BODY))
    expect(result.machineTestable).toBe(true)
  })

  it('passes when no auto-playing media or modals are present', async () => {
    const result = await checkNonEssentialContent(makePageData(CLEAN_BODY))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('fails when a <video autoplay> element is present', async () => {
    const result = await checkNonEssentialContent(makePageData(AUTOPLAY_VIDEO))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('fails when an <audio autoplay> element is present', async () => {
    const result = await checkNonEssentialContent(makePageData(AUTOPLAY_AUDIO))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('warns when a modal class is present but no autoplay', async () => {
    const result = await checkNonEssentialContent(makePageData(MODAL_BODY))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when a popup class is present but no autoplay', async () => {
    const result = await checkNonEssentialContent(makePageData(POPUP_BODY))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('fail result mentions auto-play in details', async () => {
    const result = await checkNonEssentialContent(makePageData(AUTOPLAY_VIDEO))
    expect(result.details).toContain('auto-play')
  })

  it('includes a recommendation and resources link on fail', async () => {
    const result = await checkNonEssentialContent(makePageData(AUTOPLAY_VIDEO))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
