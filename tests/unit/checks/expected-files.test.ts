// @vitest-environment node
// The real-server tests below need axios's node http adapter, not jsdom's XHR.
import { describe, it, expect, afterEach } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { checkExpectedFiles, checkBeneficialFiles } from '@/checks/expected-files'
import { PageFetcher } from '@/core/fetcher'
import type { PageData } from '@/core/types'
import type { LinkRef } from '@/utils/html-parser'
import { expectRecommendationAndResources } from './helpers'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(
  opts: {
    links?: LinkRef[]
    robotsSitemaps?: string[]
    standardFiles?: string[]
    headers?: Record<string, string>
    originalUrl?: string
    finalUrl?: string
  } = {}
): PageData {
  const {
    links = [],
    robotsSitemaps,
    standardFiles,
    headers = {},
    originalUrl = 'https://example.com',
    finalUrl = originalUrl,
  } = opts
  const body = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'
  return {
    url: originalUrl,
    fetchResult: {
      url: finalUrl,
      originalUrl,
      statusCode: 200,
      headers,
      body,
      redirectChain: [],
      fromCache: false,
      contentLength: body.length,
      robotsSitemaps,
      ...(standardFiles ? { standardFiles } : {}),
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

const ALL_EXPECTED_LINKS: LinkRef[] = [
  { rel: 'icon', href: '/favicon.ico' },
  { rel: 'manifest', href: '/site.webmanifest' },
  { rel: 'sitemap', href: '/sitemap.xml' },
]

const ALL_BENEFICIAL_LINKS: LinkRef[] = [
  { rel: 'humans', href: '/humans.txt' },
  { rel: 'security', href: '/.well-known/security.txt' },
  { rel: 'carbon', href: '/carbon.txt' },
]

// ─── checkExpectedFiles (WSG 3.17) ────────────────────────────────────────────

describe('checkExpectedFiles (WSG 3.17)', () => {
  it('returns guidelineId 3.17', async () => {
    const result = await checkExpectedFiles(makePageData({ links: ALL_EXPECTED_LINKS }))
    expect(result.guidelineId).toBe('3.17')
  })

  it('returns category web-dev', async () => {
    const result = await checkExpectedFiles(makePageData({ links: ALL_EXPECTED_LINKS }))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkExpectedFiles(makePageData({ links: ALL_EXPECTED_LINKS }))
    expect(result.machineTestable).toBe(true)
  })

  it('passes when favicon, manifest, and sitemap links are present', async () => {
    const result = await checkExpectedFiles(makePageData({ links: ALL_EXPECTED_LINKS }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when favicon link is missing', async () => {
    const links = ALL_EXPECTED_LINKS.filter((l) => l.rel !== 'icon')
    const result = await checkExpectedFiles(makePageData({ links }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('favicon')
  })

  it('warns when manifest link is missing', async () => {
    const links = ALL_EXPECTED_LINKS.filter((l) => l.rel !== 'manifest')
    const result = await checkExpectedFiles(makePageData({ links }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('manifest')
  })

  it('warns when sitemap link is missing', async () => {
    const links = ALL_EXPECTED_LINKS.filter((l) => l.rel !== 'sitemap')
    const result = await checkExpectedFiles(makePageData({ links }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('sitemap')
  })

  it('fails when all expected file links are missing', async () => {
    const result = await checkExpectedFiles(makePageData({ links: [] }))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('accepts rel="shortcut icon" as a favicon reference', async () => {
    const links: LinkRef[] = [
      { rel: 'shortcut icon', href: '/favicon.ico' },
      { rel: 'manifest', href: '/site.webmanifest' },
      { rel: 'sitemap', href: '/sitemap.xml' },
    ]
    const result = await checkExpectedFiles(makePageData({ links }))
    expect(result.status).toBe('pass')
  })

  it('includes a recommendation and resources link on failure', async () => {
    const result = await checkExpectedFiles(makePageData({ links: [] }))
    const firstResource = expectRecommendationAndResources(result)
    expect(firstResource).toContain('w3.org')
  })

  it('treats a Sitemap: declaration in robots.txt as the sitemap reference', async () => {
    const links = ALL_EXPECTED_LINKS.filter((l) => l.rel !== 'sitemap')
    const result = await checkExpectedFiles(
      makePageData({ links, robotsSitemaps: ['https://example.com/sitemap.xml'] })
    )
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('still reports the sitemap missing when robots.txt declares none', async () => {
    const links = ALL_EXPECTED_LINKS.filter((l) => l.rel !== 'sitemap')
    const result = await checkExpectedFiles(makePageData({ links, robotsSitemaps: [] }))
    expect(result.status).toBe('warn')
    expect(result.details).toContain('sitemap')
  })

  it('downgrades fail to warn when robots.txt declares a sitemap but nothing is linked', async () => {
    const result = await checkExpectedFiles(
      makePageData({ links: [], robotsSitemaps: ['https://example.com/sitemap.xml'] })
    )
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
    expect(result.details).not.toContain('sitemap')
  })

  describe('robots.txt evidence after a redirect', () => {
    const linksWithoutSitemap = ALL_EXPECTED_LINKS.filter((l) => l.rel !== 'sitemap')
    const robotsSitemaps = ['https://source.example/sitemap.xml']

    it('ignores the requested site robots.txt when the page redirected to another site', async () => {
      const result = await checkExpectedFiles(
        makePageData({
          links: linksWithoutSitemap,
          robotsSitemaps,
          originalUrl: 'https://source.example/page',
          finalUrl: 'https://dest.example/page',
        })
      )
      expect(result.status).toBe('warn')
      expect(result.details).toContain('sitemap')
    })

    it('still counts <link rel="sitemap"> on the page after a redirect to another site', async () => {
      const result = await checkExpectedFiles(
        makePageData({
          links: ALL_EXPECTED_LINKS,
          robotsSitemaps,
          originalUrl: 'https://source.example/page',
          finalUrl: 'https://dest.example/page',
        })
      )
      expect(result.status).toBe('pass')
    })

    it('keeps robots.txt credit across an http to https redirect', async () => {
      const result = await checkExpectedFiles(
        makePageData({
          links: linksWithoutSitemap,
          robotsSitemaps,
          originalUrl: 'http://example.com/page',
          finalUrl: 'https://example.com:8443/page',
        })
      )
      expect(result.status).toBe('pass')
    })

    it('keeps robots.txt credit across an apex to www redirect', async () => {
      const result = await checkExpectedFiles(
        makePageData({
          links: linksWithoutSitemap,
          robotsSitemaps,
          originalUrl: 'https://example.com/page',
          finalUrl: 'https://WWW.example.com/page',
        })
      )
      expect(result.status).toBe('pass')
    })
  })
})

// ─── checkBeneficialFiles (WSG 3.17) ─────────────────────────────────────────

describe('checkBeneficialFiles (WSG 3.17)', () => {
  it('returns guidelineId 3.17', async () => {
    const result = await checkBeneficialFiles(makePageData({ links: ALL_BENEFICIAL_LINKS }))
    expect(result.guidelineId).toBe('3.17')
  })

  it('returns category web-dev', async () => {
    const result = await checkBeneficialFiles(makePageData({ links: ALL_BENEFICIAL_LINKS }))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkBeneficialFiles(makePageData({ links: ALL_BENEFICIAL_LINKS }))
    expect(result.machineTestable).toBe(true)
  })

  it('passes when all beneficial file links are present', async () => {
    const result = await checkBeneficialFiles(makePageData({ links: ALL_BENEFICIAL_LINKS }))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when beneficial files are not referenced', async () => {
    const result = await checkBeneficialFiles(makePageData({ links: [] }))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warn message lists missing file names', async () => {
    const result = await checkBeneficialFiles(makePageData({ links: [] }))
    expect(result.details).toContain('security.txt')
    expect(result.details).toContain('humans.txt')
    expect(result.details).toContain('carbon.txt')
  })

  it('includes a recommendation and resources link on warn', async () => {
    const result = await checkBeneficialFiles(makePageData({ links: [] }))
    const firstResource = expectRecommendationAndResources(result)
    expect(firstResource).toContain('w3.org')
  })

  it('detects partial presence of beneficial files', async () => {
    const links: LinkRef[] = [{ rel: 'humans', href: '/humans.txt' }]
    const result = await checkBeneficialFiles(makePageData({ links }))
    expect(result.status).toBe('warn')
    expect(result.details).not.toContain('humans.txt')
    expect(result.details).toContain('security.txt')
  })

  it('counts files found at their standard paths without any link', async () => {
    const result = await checkBeneficialFiles(
      makePageData({ standardFiles: ['security.txt', 'carbon.txt'] })
    )
    expect(result.status).toBe('warn')
    expect(result.message).toBe('1 beneficial file(s) not provided: humans.txt.')
    expect(result.details).not.toContain('security.txt')
    expect(result.details).not.toContain('carbon.txt')
  })

  it('passes when all three files are found at their standard paths', async () => {
    const result = await checkBeneficialFiles(
      makePageData({ standardFiles: ['security.txt', 'humans.txt', 'carbon.txt'] })
    )
    expect(result.status).toBe('pass')
    expect(result.message).toBe(
      'All beneficial files provided (security.txt, humans.txt, carbon.txt).'
    )
  })

  it('counts carbon.txt as provided when the page sends a CarbonTxt-Location header', async () => {
    const result = await checkBeneficialFiles(
      makePageData({ headers: { 'carbontxt-location': 'https://example.org/carbon.txt' } })
    )
    expect(result.details).toContain('security.txt')
    expect(result.details).not.toContain('carbon.txt')
  })

  it('does not ask for a <link> in the recommendation', async () => {
    const result = await checkBeneficialFiles(makePageData({ links: [] }))
    expect(result.recommendation).not.toContain('<head>')
    expect(result.recommendation).toContain('/.well-known/carbon.txt')
  })
})

// ─── checkBeneficialFiles against a real server ──────────────────────────────

/**
 * Runs the real fetcher (un-mocked HttpClient and axios) against local servers,
 * so the standard-path requests, their content types and status codes all
 * cross the network as they would on a deployed site.
 */
describe('checkBeneficialFiles against a real server', () => {
  type Route = {
    status?: number
    type?: string
    headers?: Record<string, string>
    body?: string
    hang?: boolean
  }
  const PAGE: Route = { type: 'text/html; charset=utf-8', body: '<!DOCTYPE html><html></html>' }
  const TEXT: Route = { type: 'text/plain; charset=utf-8', body: 'Contact: mailto:a@example.com\n' }
  const servers: http.Server[] = []

  /** Starts a server for `routes`; any other path gets `fallback` (404 by default). */
  async function serve(
    routes: Record<string, Route>,
    fallback: Route = { status: 404, body: '' }
  ): Promise<string> {
    const server = http.createServer((req, res) => {
      const route = routes[req.url ?? ''] ?? fallback
      if (route.hang) return
      res.writeHead(route.status ?? 200, {
        ...(route.type ? { 'Content-Type': route.type } : {}),
        ...route.headers,
      })
      res.end(route.body ?? '')
    })
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  }

  async function checkSite(url: string, timeout?: number) {
    const fetcher = new PageFetcher({
      maxRetries: 0,
      timeout,
      hostPolicy: { allowLoopback: true, allowPrivateNetwork: false },
    })
    const page = await fetcher.fetch(url)
    expect(page.ok).toBe(true)
    if (!page.ok) throw page.error
    return checkBeneficialFiles(page.value)
  }

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve) => {
            server.closeAllConnections()
            server.close(() => resolve())
          })
      )
    )
  })

  it('counts security.txt and carbon.txt under /.well-known/ and reports only humans.txt', async () => {
    const base = await serve({
      '/': PAGE,
      '/.well-known/security.txt': TEXT,
      '/.well-known/carbon.txt': TEXT,
    })

    const result = await checkSite(`${base}/`)

    expect(result.status).toBe('warn')
    expect(result.message).toBe('1 beneficial file(s) not provided: humans.txt.')
  })

  it('passes when all three are served at the site root and /.well-known/', async () => {
    const base = await serve({
      '/': PAGE,
      '/.well-known/security.txt': TEXT,
      '/humans.txt': TEXT,
      '/carbon.txt': TEXT,
    })

    const result = await checkSite(`${base}/`)

    expect(result.status).toBe('pass')
  })

  /** Every file is served as plain text except the one at `path`, which gets `route`. */
  function allServedExcept(path: string, route: Route): Record<string, Route> {
    return {
      '/': PAGE,
      '/.well-known/security.txt': TEXT,
      '/humans.txt': TEXT,
      '/carbon.txt': TEXT,
      [path]: route,
    }
  }

  it('does not count an HTML catch-all page as a file', async () => {
    // A single-page app answers every path with its HTML shell.
    const base = await serve({ '/': PAGE }, PAGE)

    const result = await checkSite(`${base}/`)

    expect(result.message).toBe(
      '3 beneficial file(s) not provided: security.txt, humans.txt, carbon.txt.'
    )
  })

  it('does not count a security.txt that is not text/plain', async () => {
    const base = await serve(
      allServedExcept('/.well-known/security.txt', {
        type: 'application/octet-stream',
        body: 'Contact: x',
      })
    )

    const result = await checkSite(`${base}/`)

    expect(result.message).toBe('1 beneficial file(s) not provided: security.txt.')
  })

  it('does not follow a redirect from a standard path', async () => {
    const base = await serve({
      ...allServedExcept('/humans.txt', { status: 301, headers: { Location: '/team.txt' } }),
      '/team.txt': TEXT,
    })

    const result = await checkSite(`${base}/`)

    expect(result.message).toBe('1 beneficial file(s) not provided: humans.txt.')
  })

  it.each([404, 403, 500])('does not count a text/plain answer with status %i', async (status) => {
    const base = await serve(
      allServedExcept('/humans.txt', { status, type: 'text/plain', body: 'Not Found' })
    )

    const result = await checkSite(`${base}/`)

    expect(result.message).toBe('1 beneficial file(s) not provided: humans.txt.')
  })

  it('counts carbon.txt when the page response sends a CarbonTxt-Location header', async () => {
    const base = await serve({
      '/': { ...PAGE, headers: { 'CarbonTxt-Location': 'https://example.org/carbon.txt' } },
    })

    const result = await checkSite(`${base}/`)

    expect(result.details).not.toContain('carbon.txt')
    expect(result.details).toContain('security.txt')
  })

  it('probes the origin the page redirected to, not the one requested', async () => {
    const destination = await serve({ '/': PAGE, '/.well-known/security.txt': TEXT })
    const start = await serve({
      '/': { status: 301, headers: { Location: `${destination}/` } },
      '/humans.txt': TEXT,
    })

    const result = await checkSite(`${start}/`)

    expect(result.message).toBe('2 beneficial file(s) not provided: humans.txt, carbon.txt.')
  })

  it('treats a file that does not answer within the timeout as absent', async () => {
    const base = await serve({
      '/': PAGE,
      '/.well-known/security.txt': TEXT,
      '/humans.txt': { hang: true },
    })

    const result = await checkSite(`${base}/`, 500)

    expect(result.message).toBe('2 beneficial file(s) not provided: humans.txt, carbon.txt.')
  })
})
