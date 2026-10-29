import { describe, it, expect } from 'vitest'
import { checkExpectedFiles, checkBeneficialFiles } from '@/checks/expected-files'
import type { PageData } from '@/core/types'
import type { LinkRef } from '@/utils/html-parser'
import { expectRecommendationAndResources } from './helpers'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(
  opts: {
    links?: LinkRef[]
    robotsSitemaps?: string[]
    originalUrl?: string
    finalUrl?: string
  } = {}
): PageData {
  const {
    links = [],
    robotsSitemaps,
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
      headers: {},
      body,
      redirectChain: [],
      fromCache: false,
      contentLength: body.length,
      robotsSitemaps,
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
})
