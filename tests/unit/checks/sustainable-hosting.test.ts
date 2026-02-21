import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkSustainableHosting } from '@/checks/sustainable-hosting'
import type { PageData } from '@/core/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/utils/carbon-estimator', () => ({
  checkGreenHosting: vi.fn(),
}))

import { checkGreenHosting } from '@/utils/carbon-estimator'
const mockCheckGreenHosting = vi.mocked(checkGreenHosting)

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(url = 'https://example.com'): PageData {
  const body = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'
  return {
    url,
    fetchResult: {
      url,
      originalUrl: url,
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

// ─── Tests ────────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.resetAllMocks()
})

describe('checkSustainableHosting (WSG 4.1)', () => {
  it('returns guidelineId 4.1', async () => {
    mockCheckGreenHosting.mockResolvedValue(true)
    const result = await checkSustainableHosting(makePageData())
    expect(result.guidelineId).toBe('4.1')
  })

  it('returns category hosting', async () => {
    mockCheckGreenHosting.mockResolvedValue(true)
    const result = await checkSustainableHosting(makePageData())
    expect(result.category).toBe('hosting')
  })

  it('is marked as machine-testable', async () => {
    mockCheckGreenHosting.mockResolvedValue(true)
    const result = await checkSustainableHosting(makePageData())
    expect(result.machineTestable).toBe(true)
  })

  it('has high impact', async () => {
    mockCheckGreenHosting.mockResolvedValue(true)
    const result = await checkSustainableHosting(makePageData())
    expect(result.impact).toBe('high')
  })

  it('passes when the domain is green hosted', async () => {
    mockCheckGreenHosting.mockResolvedValue(true)
    const result = await checkSustainableHosting(makePageData())
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
    expect(result.message).toContain('example.com')
  })

  it('fails when the domain is not green hosted', async () => {
    mockCheckGreenHosting.mockResolvedValue(false)
    const result = await checkSustainableHosting(makePageData())
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
    expect(result.message).toContain('example.com')
  })

  it('includes recommendation and resources on failure', async () => {
    mockCheckGreenHosting.mockResolvedValue(false)
    const result = await checkSustainableHosting(makePageData())
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources!.some((r) => r.startsWith('https://www.w3.org/'))).toBe(true)
  })

  it('extracts hostname correctly from the page url', async () => {
    mockCheckGreenHosting.mockResolvedValue(true)
    await checkSustainableHosting(makePageData('https://www.mysite.org/page'))
    expect(mockCheckGreenHosting).toHaveBeenCalledWith('www.mysite.org')
  })
})
