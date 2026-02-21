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
 *     - Sitemap    — `<link rel="sitemap">` in the document head
 *
 *   Missing these files wastes browser round-trips (a 404 on favicon is fetched
 *   by every browser), produces poor search-engine previews, and degrades the
 *   user experience on mobile home-screen installs.
 *
 *   Scoring (based on references found in HTML `<link>` elements):
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
 *   These are detected via `<link>` elements pointing to their conventional
 *   paths.  The check always returns at most a `warn` (they are nice-to-have,
 *   not required).
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#provide-information-about-file-provenance
 */

import type { CheckFn } from '../core/types.js'

// ─── checkExpectedFiles (WSG 3.17 — Expected) ─────────────────────────────────

const EF_GUIDELINE_ID = '3.17'
const EF_GUIDELINE_NAME = 'Expected Files Present'
const EF_SUCCESS_CRITERION = 'Pages should link to a favicon, a web app manifest, and a sitemap'
const EF_RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#provide-information-about-file-provenance',
]

/** `rel` values that indicate a favicon `<link>` element. */
const FAVICON_RELS = new Set(['icon', 'shortcut icon', 'apple-touch-icon'])

export const checkExpectedFiles: CheckFn = (page) => {
  const { links } = page.parsedPage

  const hasFavicon = links.some((l) => l.rel && FAVICON_RELS.has(l.rel.toLowerCase()))
  const hasManifest = links.some((l) => l.rel?.toLowerCase() === 'manifest')
  const hasSitemap = links.some((l) => l.rel?.toLowerCase() === 'sitemap')

  const missing: string[] = []
  if (!hasFavicon) missing.push('favicon (<link rel="icon">)')
  if (!hasManifest) missing.push('web app manifest (<link rel="manifest">)')
  if (!hasSitemap) missing.push('sitemap (<link rel="sitemap">)')

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
      'Add a <link rel="icon"> for the favicon, a <link rel="manifest"> for the web app ' +
      'manifest, and a <link rel="sitemap" href="/sitemap.xml"> to the document <head>. ' +
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

/** Path substrings that identify beneficial file `<link>` references. */
const BENEFICIAL_FILE_PATHS: { path: string; label: string }[] = [
  { path: 'security.txt', label: 'security.txt' },
  { path: 'humans.txt', label: 'humans.txt' },
  { path: 'carbon.txt', label: 'carbon.txt' },
]

export const checkBeneficialFiles: CheckFn = (page) => {
  const allHrefs = page.parsedPage.links
    .map((l) => (l.href ?? '').toLowerCase())
    .concat(
      page.parsedPage.metaTags
        .map((m) => (m.content ?? '').toLowerCase())
        .filter((c) => c.includes('.txt'))
    )

  const found = BENEFICIAL_FILE_PATHS.filter(({ path }) =>
    allHrefs.some((href) => href.includes(path))
  ).map((f) => f.label)

  const missing = BENEFICIAL_FILE_PATHS.filter(
    ({ path }) => !allHrefs.some((href) => href.includes(path))
  ).map((f) => f.label)

  if (missing.length === 0) {
    return {
      guidelineId: BF_GUIDELINE_ID,
      guidelineName: BF_GUIDELINE_NAME,
      successCriterion: BF_SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `All beneficial files referenced (${found.join(', ')}).`,
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
    message: `${missing.length} beneficial file(s) not referenced: ${missing.join(', ')}.`,
    details: `Not referenced: ${missing.join(', ')}`,
    recommendation:
      'Consider adding: ' +
      '/.well-known/security.txt to declare a vulnerability disclosure contact (RFC 9116); ' +
      '/humans.txt to credit the people who built the site; ' +
      '/carbon.txt to disclose your sustainable hosting details for automated carbon reporting. ' +
      'Link to them from the document <head> so automated tools can discover them.',
    resources: BF_RESOURCES,
    impact: 'low',
    category: 'web-dev',
    machineTestable: true,
  }
}
