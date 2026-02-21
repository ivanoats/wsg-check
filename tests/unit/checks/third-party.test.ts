import { describe, it, expect } from 'vitest'
import { checkThirdParty } from '@/checks/third-party'
import type { PageData } from '@/core/types'
import type { ResourceReference } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeScript(url: string): ResourceReference {
  return { type: 'script', url, attributes: { src: url } }
}

function makeStylesheet(url: string): ResourceReference {
  return { type: 'stylesheet', url, attributes: { href: url } }
}

function makePageData(resources: ResourceReference[], url = 'https://example.com'): PageData {
  const thirdPartyCount = resources.filter((r) => {
    try {
      return new URL(r.url).hostname !== 'example.com'
    } catch {
      return false
    }
  }).length
  return {
    url,
    fetchResult: {
      url,
      originalUrl: url,
      statusCode: 200,
      headers: {},
      body: '<!DOCTYPE html><html><body></body></html>',
      redirectChain: [],
      fromCache: false,
      contentLength: 40,
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
      htmlSize: 40,
      resourceCount: resources.length,
      firstPartyCount: resources.length - thirdPartyCount,
      thirdPartyCount,
      compression: { isCompressed: false },
      byType: { stylesheet: 0, script: 0, image: 0, font: 0, media: 0, other: 0 },
    },
  } as PageData
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkThirdParty (WSG 3.6)', () => {
  it('returns guidelineId 3.6', async () => {
    const result = await checkThirdParty(makePageData([]))
    expect(result.guidelineId).toBe('3.6')
  })

  it('returns category web-dev', async () => {
    const result = await checkThirdParty(makePageData([]))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkThirdParty(makePageData([]))
    expect(result.machineTestable).toBe(true)
  })

  it('passes when there are no third-party scripts', async () => {
    const resources = [
      makeScript('https://example.com/app.js'),
      makeStylesheet('https://example.com/styles.css'),
    ]
    const result = await checkThirdParty(makePageData(resources))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes when there are no resources at all', async () => {
    const result = await checkThirdParty(makePageData([]))
    expect(result.status).toBe('pass')
  })

  it('warns when there are 1-5 third-party scripts', async () => {
    const resources = [
      makeScript('https://analytics.google.com/ga.js'),
      makeScript('https://cdn.example.com/widget.js'),
    ]
    const result = await checkThirdParty(makePageData(resources))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warn result includes the third-party script URLs in details', async () => {
    const resources = [makeScript('https://tracker.thirdparty.com/t.js')]
    const result = await checkThirdParty(makePageData(resources))
    expect(result.details).toContain('tracker.thirdparty.com')
  })

  it('fails when there are more than 5 third-party scripts', async () => {
    const resources = Array.from({ length: 6 }, (_, i) =>
      makeScript(`https://cdn${i}.thirdparty.com/script.js`)
    )
    const result = await checkThirdParty(makePageData(resources))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('reports the total third-party resource count in the message', async () => {
    const resources = [
      makeScript('https://analytics.google.com/ga.js'),
      makeStylesheet('https://fonts.googleapis.com/css2'),
    ]
    const result = await checkThirdParty(makePageData(resources))
    // Message should mention third-party resource total (2 in this case)
    expect(result.message).toContain('2')
  })

  it('treats same-domain resources as first-party', async () => {
    const resources = [
      makeScript('https://www.example.com/app.js'),
      makeScript('https://api.example.com/data.js'),
    ]
    const result = await checkThirdParty(makePageData(resources))
    // Both are under example.com — should pass
    expect(result.status).toBe('pass')
  })

  it('includes a recommendation and resources link on warn', async () => {
    const resources = [makeScript('https://tracker.thirdparty.com/t.js')]
    const result = await checkThirdParty(makePageData(resources))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})
