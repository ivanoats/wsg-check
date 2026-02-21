import { describe, it, expect } from 'vitest'
import { checkOfflineAccess } from '@/checks/offline-access'
import type { PageData } from '@/core/types'
import type { LinkRef } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SW_SCRIPT = '<script>navigator.serviceWorker.register("/sw.js")</script>'

function makePageData(
  options: {
    hasManifest?: boolean
    hasServiceWorker?: boolean
  } = {}
): PageData {
  const body = options.hasServiceWorker
    ? `<!DOCTYPE html><html lang="en"><head></head><body>${SW_SCRIPT}</body></html>`
    : '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'

  const links: LinkRef[] = options.hasManifest ? [{ rel: 'manifest', href: '/manifest.json' }] : []

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
      links,
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

describe('checkOfflineAccess (WSG 4.2)', () => {
  it('returns guidelineId 4.2', async () => {
    const result = await checkOfflineAccess(makePageData())
    expect(result.guidelineId).toBe('4.2')
  })

  it('returns category hosting', async () => {
    const result = await checkOfflineAccess(makePageData())
    expect(result.category).toBe('hosting')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkOfflineAccess(makePageData())
    expect(result.machineTestable).toBe(true)
  })

  it('has medium impact', async () => {
    const result = await checkOfflineAccess(makePageData())
    expect(result.impact).toBe('medium')
  })

  it('passes when both manifest and service worker are present', async () => {
    const result = await checkOfflineAccess(
      makePageData({ hasManifest: true, hasServiceWorker: true })
    )
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when only manifest is present', async () => {
    const result = await checkOfflineAccess(
      makePageData({ hasManifest: true, hasServiceWorker: false })
    )
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
    expect(result.message).toContain('manifest')
  })

  it('warns when only service worker is present', async () => {
    const result = await checkOfflineAccess(
      makePageData({ hasManifest: false, hasServiceWorker: true })
    )
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
    expect(result.message).toContain('service worker')
  })

  it('fails when neither manifest nor service worker is present', async () => {
    const result = await checkOfflineAccess(
      makePageData({ hasManifest: false, hasServiceWorker: false })
    )
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('includes recommendation and resources on failure', async () => {
    const result = await checkOfflineAccess(makePageData())
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources!.some((r) => r.startsWith('https://www.w3.org/'))).toBe(true)
  })

  it('detects service worker registration in inline script', async () => {
    const result = await checkOfflineAccess(
      makePageData({ hasManifest: true, hasServiceWorker: true })
    )
    expect(result.status).toBe('pass')
  })
})
