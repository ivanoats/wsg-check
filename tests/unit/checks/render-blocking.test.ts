import { describe, it, expect } from 'vitest'
import { checkRenderBlocking } from '@/checks/render-blocking'
import type { PageData } from '@/core/types'
import type { ResourceReference } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeScript(url: string, attrs: Record<string, string> = {}): ResourceReference {
  return { type: 'script', url, attributes: { src: url, ...attrs } }
}

function makeImage(url: string, attrs: Record<string, string> = {}): ResourceReference {
  return { type: 'image', url, attributes: { src: url, ...attrs } }
}

function makePageData(resources: ResourceReference[]): PageData {
  return {
    url: 'https://example.com',
    fetchResult: {
      url: 'https://example.com',
      originalUrl: 'https://example.com',
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
      firstPartyCount: resources.length,
      thirdPartyCount: 0,
      compression: { isCompressed: false },
      byType: { stylesheet: 0, script: 0, image: 0, font: 0, media: 0, other: 0 },
    },
  } as PageData
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkRenderBlocking (WSG 3.9)', () => {
  it('returns guidelineId 3.9', async () => {
    const result = await checkRenderBlocking(makePageData([]))
    expect(result.guidelineId).toBe('3.9')
  })

  it('returns category web-dev', async () => {
    const result = await checkRenderBlocking(makePageData([]))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkRenderBlocking(makePageData([]))
    expect(result.machineTestable).toBe(true)
  })

  it('returns not-applicable when there are no scripts or images', async () => {
    const result = await checkRenderBlocking(makePageData([]))
    expect(result.status).toBe('not-applicable')
  })

  it('fails when a script has no async or defer', async () => {
    const result = await checkRenderBlocking(
      makePageData([makeScript('https://example.com/app.js')])
    )
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('fail result includes the blocking script URL in details', async () => {
    const result = await checkRenderBlocking(
      makePageData([makeScript('https://example.com/blocking.js')])
    )
    expect(result.details).toContain('blocking.js')
  })

  it('passes when a script has the async attribute', async () => {
    const result = await checkRenderBlocking(
      makePageData([makeScript('https://example.com/app.js', { async: '' })])
    )
    // No images, so all clear
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes when a script has the defer attribute', async () => {
    const result = await checkRenderBlocking(
      makePageData([makeScript('https://example.com/app.js', { defer: '' })])
    )
    expect(result.status).toBe('pass')
  })

  it('fails when at least one of multiple scripts is blocking', async () => {
    const resources = [
      makeScript('https://example.com/a.js', { defer: '' }),
      makeScript('https://example.com/b.js'), // blocking
    ]
    const result = await checkRenderBlocking(makePageData(resources))
    expect(result.status).toBe('fail')
    expect(result.details).toContain('b.js')
    expect(result.details).not.toContain('a.js')
  })

  it('warns when all scripts are deferred but images lack lazy loading', async () => {
    const resources = [
      makeScript('https://example.com/app.js', { defer: '' }),
      makeImage('https://example.com/photo.jpg'), // no loading="lazy"
    ]
    const result = await checkRenderBlocking(makePageData(resources))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warn result includes the non-lazy image URL in details', async () => {
    const resources = [makeImage('https://example.com/hero.jpg')]
    const result = await checkRenderBlocking(makePageData(resources))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('hero.jpg')
  })

  it('passes when all images use loading="lazy" and scripts are deferred', async () => {
    const resources = [
      makeScript('https://example.com/app.js', { async: '' }),
      makeImage('https://example.com/photo.jpg', { loading: 'lazy' }),
    ]
    const result = await checkRenderBlocking(makePageData(resources))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('passes when there are only lazy-loaded images and no scripts', async () => {
    const resources = [makeImage('https://example.com/a.jpg', { loading: 'lazy' })]
    const result = await checkRenderBlocking(makePageData(resources))
    expect(result.status).toBe('pass')
  })

  it('fail takes priority over missing lazy-loading', async () => {
    // Blocking script AND non-lazy image → should fail (not warn)
    const resources = [
      makeScript('https://example.com/app.js'), // blocking
      makeImage('https://example.com/photo.jpg'), // no lazy
    ]
    const result = await checkRenderBlocking(makePageData(resources))
    expect(result.status).toBe('fail')
  })

  it('includes a recommendation and resources link on fail', async () => {
    const result = await checkRenderBlocking(
      makePageData([makeScript('https://example.com/app.js')])
    )
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })

  it('includes a recommendation and resources link on warn', async () => {
    const result = await checkRenderBlocking(makePageData([makeImage('https://example.com/a.jpg')]))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })

  it('counts blocking scripts correctly in the message', async () => {
    const resources = [
      makeScript('https://example.com/a.js'),
      makeScript('https://example.com/b.js'),
    ]
    const result = await checkRenderBlocking(makePageData(resources))
    expect(result.message).toContain('2')
  })

  it('counts non-lazy images correctly in the warn message', async () => {
    const resources = [
      makeImage('https://example.com/a.jpg'),
      makeImage('https://example.com/b.jpg'),
      makeImage('https://example.com/c.jpg', { loading: 'lazy' }),
    ]
    const result = await checkRenderBlocking(makePageData(resources))
    expect(result.status).toBe('warn')
    expect(result.message).toContain('2')
    expect(result.message).toContain('3')
  })
})
