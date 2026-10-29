import { describe, it, expect } from 'vitest'
import { checkOfflineAccess } from '@/checks/offline-access'
import type { PageData } from '@/core/types'
import { parseHtml } from '@/utils/html-parser'
import type { LinkRef, ParsedPage, ResourceReference } from '@/utils/html-parser'
import { expectRecommendationAndResources } from './helpers'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SW_SCRIPT = '<script>navigator.serviceWorker.register("/sw.js")</script>'

/** An external script, as the parser reports `<script src="/reg.js" defer>`. */
const EXTERNAL_SCRIPT: ResourceReference = {
  type: 'script',
  url: 'https://example.com/reg.js',
  attributes: { src: '/reg.js', defer: '' },
}

/** The same script preloaded and then loaded: the parser emits two script resources. */
const PRELOADED_AND_LOADED_SCRIPT_HTML = `<!DOCTYPE html><html lang=en><head><title>t</title>
<link rel="manifest" href="/manifest.json"><link rel="preload" as="script" href="/app.js"></head>
<body><script src="/app.js"></script></body></html>`

/** Repro fixture: manifest link plus an external script that registers the worker. */
const MANIFEST_AND_EXTERNAL_SCRIPT_HTML = `<!DOCTYPE html><html lang=en><head><title>t</title>
<link rel="manifest" href="/manifest.json"></head>
<body><script src="/reg.js" defer></script></body></html>`

function makePageData(
  options: {
    hasManifest?: boolean
    hasServiceWorker?: boolean
    resources?: ReadonlyArray<ResourceReference>
    body?: string
    parsedPage?: ParsedPage
  } = {}
): PageData {
  const defaultBody = options.hasServiceWorker
    ? `<!DOCTYPE html><html lang="en"><head></head><body>${SW_SCRIPT}</body></html>`
    : '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'
  const body = options.body ?? defaultBody

  const links: LinkRef[] = options.hasManifest ? [{ rel: 'manifest', href: '/manifest.json' }] : []

  const page = {
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
      resources: [...(options.resources ?? [])],
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
  return options.parsedPage ? { ...page, parsedPage: options.parsedPage } : page
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

  it('warns when only manifest is present and the page has no external scripts', async () => {
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
    const firstResource = expectRecommendationAndResources(result)
    expect(firstResource).toContain('w3.org')
  })

  it('detects service worker registration in inline script', async () => {
    const result = await checkOfflineAccess(
      makePageData({ hasManifest: true, hasServiceWorker: true })
    )
    expect(result.status).toBe('pass')
  })

  describe('with external scripts linked', () => {
    it('returns info when the manifest is present but no inline registration is found', async () => {
      const result = await checkOfflineAccess(
        makePageData({ hasManifest: true, resources: [EXTERNAL_SCRIPT] })
      )
      expect(result.status).toBe('info')
      expect(result.score).toBe(0)
      expect(result.message).toContain('external scripts are not analysed')
      expect(result.machineTestable).toBe(true)
    })

    it('info result still carries a recommendation and resources', async () => {
      const result = await checkOfflineAccess(
        makePageData({ hasManifest: true, resources: [EXTERNAL_SCRIPT] })
      )
      const firstResource = expectRecommendationAndResources(result)
      expect(firstResource).toContain('w3.org')
    })

    it('still fails when neither is found, and the details mention external scripts', async () => {
      const result = await checkOfflineAccess(makePageData({ resources: [EXTERNAL_SCRIPT] }))
      expect(result.status).toBe('fail')
      expect(result.score).toBe(0)
      expect(result.details).toContain('External scripts are not analysed')
    })

    it('does not mention external scripts in fail details when none are linked', async () => {
      const result = await checkOfflineAccess(makePageData())
      expect(result.details).not.toContain('External scripts')
    })

    it('still warns when only an inline service worker is found (no manifest)', async () => {
      const result = await checkOfflineAccess(
        makePageData({ hasServiceWorker: true, resources: [EXTERNAL_SCRIPT] })
      )
      expect(result.status).toBe('warn')
      expect(result.score).toBe(50)
    })

    it('returns info for a parsed document with a manifest and one external script', async () => {
      const parsed = parseHtml(MANIFEST_AND_EXTERNAL_SCRIPT_HTML, 'https://example.com')
      const result = await checkOfflineAccess(
        makePageData({ body: MANIFEST_AND_EXTERNAL_SCRIPT_HTML, parsedPage: parsed })
      )
      expect(result.status).toBe('info')
    })

    it('counts a preloaded script and its <script src> as one external script', async () => {
      const parsed = parseHtml(PRELOADED_AND_LOADED_SCRIPT_HTML, 'https://example.com')
      const result = await checkOfflineAccess(
        makePageData({ body: PRELOADED_AND_LOADED_SCRIPT_HTML, parsedPage: parsed })
      )
      expect(result.status).toBe('info')
      expect(result.details).toContain('(1 external script(s) linked')
    })
  })
})
