/**
 * WSG 3.17 – Provide Information About File Provenance / Expected & Beneficial Files
 *
 * Two related checks that verify the presence of standard web files:
 *
 * `checkExpectedFiles` (WSG 3.17 — Expected)
 *   Checks that the page references the standard files that browsers and search
 *   engines rely on for correct presentation and indexing:
 *     - Favicon    — `<link rel="icon">` (or `rel="shortcut icon"`)
 *     - Web App Manifest — `<link rel="manifest">`
 *     - Sitemap    — a robots.txt `Sitemap:` line or `<link rel="sitemap">`
 *
 *   Missing these files wastes browser round-trips (a 404 on favicon is fetched
 *   by every browser), produces poor search-engine previews, and degrades the
 *   user experience on mobile home-screen installs.
 *
 *   Scoring:
 *     - All 3 referenced        → pass  (100)
 *     - 1–2 missing             → warn   (50)
 *     - All 3 missing           → fail    (0)
 *
 * `checkBeneficialFiles` (WSG 3.17 — Beneficial)
 *   Encourages the presence of voluntary disclosure files that improve
 *   trust and transparency:
 *     - `security.txt` — vulnerability disclosure contact info
 *     - `humans.txt`   — credits the people behind the site
 *     - `carbon.txt`   — declares the site's sustainable hosting details
 *
 *   A file counts as provided when the fetcher found it at its standard path
 *   (`page.fetchResult.standardFiles`), when the page sends a
 *   `CarbonTxt-Location` header (carbon.txt only), or when a `<link>` or
 *   `<meta>` names it.  The check always returns at most a `warn` (they are
 *   nice-to-have, not required).
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#provide-information-about-file-provenance
 */

import type { CheckFn } from '../core/types'

// ─── checkExpectedFiles (WSG 3.17 — Expected) ─────────────────────────────────

const EF_GUIDELINE_ID = '3.17'
const EF_GUIDELINE_NAME = 'Expected Files Present'
const EF_SUCCESS_CRITERION = 'Pages should provide a favicon, a web app manifest, and a sitemap'
const EF_RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#provide-information-about-file-provenance',
]

/** `rel` values that indicate a favicon `<link>` element. */
const FAVICON_RELS = new Set(['icon', 'shortcut icon', 'apple-touch-icon'])

/** Lower-cased hostname with one leading `www.` removed; scheme and port ignored. */
const siteOf = (url: string): string => new URL(url).hostname.toLowerCase().replace(/^www\./, '')

export const checkExpectedFiles: CheckFn = (page) => {
  const { links } = page.parsedPage
  const { originalUrl, url, robotsSitemaps } = page.fetchResult

  const hasFavicon = links.some((l) => l.rel && FAVICON_RELS.has(l.rel.toLowerCase()))
  const hasManifest = links.some((l) => l.rel?.toLowerCase() === 'manifest')
  // robots.txt was read from the requested host. After a redirect to a different
  // site, its Sitemap: lines describe a site the scored page is not on, so they
  // would give the destination unearned credit.
  const robotsApply = (robotsSitemaps?.length ?? 0) > 0 && siteOf(originalUrl) === siteOf(url)
  const hasSitemap = links.some((l) => l.rel?.toLowerCase() === 'sitemap') || robotsApply

  const missing: string[] = []
  if (!hasFavicon) missing.push('favicon (<link rel="icon">)')
  if (!hasManifest) missing.push('web app manifest (<link rel="manifest">)')
  if (!hasSitemap) missing.push('sitemap (robots.txt Sitemap: line or <link rel="sitemap">)')

  if (missing.length === 0) {
    return {
      guidelineId: EF_GUIDELINE_ID,
      guidelineName: EF_GUIDELINE_NAME,
      successCriterion: EF_SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'All expected files are referenced (favicon, manifest, and sitemap).',
      impact: 'medium',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  const isFail = missing.length === 3

  return {
    guidelineId: EF_GUIDELINE_ID,
    guidelineName: EF_GUIDELINE_NAME,
    successCriterion: EF_SUCCESS_CRITERION,
    status: isFail ? 'fail' : 'warn',
    score: isFail ? 0 : 50,
    message: `${missing.length} expected file reference(s) missing.`,
    details: `Missing: ${missing.join('; ')}`,
    recommendation:
      'Add a <link rel="icon"> for the favicon and a <link rel="manifest"> for the web app ' +
      'manifest to the document <head>, and declare your sitemap with a ' +
      '"Sitemap: https://example.com/sitemap.xml" line in robots.txt (or a ' +
      '<link rel="sitemap" href="/sitemap.xml"> in the <head>). ' +
      'The favicon prevents a 404 round-trip on every page load; the manifest enables ' +
      'home-screen installs on mobile; the sitemap reference helps search engines index ' +
      'your content efficiently.',
    resources: EF_RESOURCES,
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
  }
}

// ─── checkBeneficialFiles (WSG 3.17 — Beneficial) ────────────────────────────

const BF_GUIDELINE_ID = '3.17'
const BF_GUIDELINE_NAME = 'Beneficial Files Present'
const BF_SUCCESS_CRITERION =
  'Sites should provide security.txt, humans.txt, and carbon.txt for transparency'
const BF_RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#provide-information-about-file-provenance',
]

/** Beneficial file names, also matched as substrings of `<link>` and `<meta>` references. */
const BENEFICIAL_FILES = ['security.txt', 'humans.txt', 'carbon.txt']

export const checkBeneficialFiles: CheckFn = (page) => {
  const { standardFiles = [], headers } = page.fetchResult
  const allHrefs = page.parsedPage.links
    .map((l) => (l.href ?? '').toLowerCase())
    .concat(
      page.parsedPage.metaTags
        .map((m) => (m.content ?? '').toLowerCase())
        .filter((c) => c.includes('.txt'))
    )
  const hasCarbonTxtHeader = (headers['carbontxt-location'] ?? '').trim() !== ''

  const isProvided = (name: string): boolean =>
    standardFiles.includes(name) ||
    (name === 'carbon.txt' && hasCarbonTxtHeader) ||
    allHrefs.some((href) => href.includes(name))

  const found = BENEFICIAL_FILES.filter(isProvided)
  const missing = BENEFICIAL_FILES.filter((name) => !isProvided(name))

  if (missing.length === 0) {
    return {
      guidelineId: BF_GUIDELINE_ID,
      guidelineName: BF_GUIDELINE_NAME,
      successCriterion: BF_SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `All beneficial files provided (${found.join(', ')}).`,
      impact: 'low',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  return {
    guidelineId: BF_GUIDELINE_ID,
    guidelineName: BF_GUIDELINE_NAME,
    successCriterion: BF_SUCCESS_CRITERION,
    status: 'warn',
    score: 50,
    message: `${missing.length} beneficial file(s) not provided: ${missing.join(', ')}.`,
    details: `Not found at a standard path or in a page link: ${missing.join(', ')}`,
    recommendation:
      'Consider adding: ' +
      '/.well-known/security.txt, served as text/plain, to declare a vulnerability disclosure contact (RFC 9116); ' +
      '/humans.txt to credit the people who built the site; ' +
      '/carbon.txt or /.well-known/carbon.txt to disclose your sustainable hosting details for automated carbon reporting.',
    resources: BF_RESOURCES,
    impact: 'low',
    category: 'web-dev',
    machineTestable: true,
  }
}
