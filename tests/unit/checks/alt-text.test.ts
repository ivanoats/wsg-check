import { describe, it, expect } from 'vitest'
import { checkAltText } from '@/checks/alt-text'
import type { PageData } from '@/core/types'
import type { ResourceReference } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeImage(url: string, alt?: string): ResourceReference {
  const attributes: Record<string, string> = { src: url }
  if (alt !== undefined) attributes.alt = alt
  return { type: 'image', url, attributes }
}

function makePageData(resources: ResourceReference[]): PageData {
  const body = '<!DOCTYPE html><html><head></head><body></body></html>'
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
      byType: { stylesheet: 0, script: 0, image: resources.length, font: 0, media: 0, other: 0 },
    },
  } as PageData
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkAltText (WSG 2.17)', () => {
  it('returns guidelineId 2.17', async () => {
    const result = await checkAltText(makePageData([]))
    expect(result.guidelineId).toBe('2.17')
  })

  it('returns category ux', async () => {
    const result = await checkAltText(makePageData([]))
    expect(result.category).toBe('ux')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkAltText(makePageData([]))
    expect(result.machineTestable).toBe(true)
  })

  it('returns not-applicable when no images are present', async () => {
    const result = await checkAltText(makePageData([]))
    expect(result.status).toBe('not-applicable')
  })

  it('passes when all images have a non-empty alt attribute', async () => {
    const resources = [
      makeImage('https://example.com/a.jpg', 'A scenic mountain'),
      makeImage('https://example.com/b.jpg', 'Company logo'),
    ]
    const result = await checkAltText(makePageData(resources))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes when images have an empty alt attribute (decorative)', async () => {
    const resources = [makeImage('https://example.com/decoration.png', '')]
    const result = await checkAltText(makePageData(resources))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('fails when any image is missing the alt attribute', async () => {
    const resources = [
      makeImage('https://example.com/a.jpg', 'Described'),
      makeImage('https://example.com/b.jpg'), // no alt
    ]
    const result = await checkAltText(makePageData(resources))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('fail result message includes the missing count and total', async () => {
    const resources = [
      makeImage('https://example.com/a.jpg'), // no alt
      makeImage('https://example.com/b.jpg'), // no alt
      makeImage('https://example.com/c.jpg', 'OK'),
    ]
    const result = await checkAltText(makePageData(resources))
    expect(result.message).toContain('2')
    expect(result.message).toContain('3')
  })

  it('includes a recommendation and resources link on fail', async () => {
    const resources = [makeImage('https://example.com/a.jpg')]
    const result = await checkAltText(makePageData(resources))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
