/**
 * WSG 4.2 – Optimise Browser Caching (Caching Headers)
 *
 * Verifies that the page response includes HTTP caching directives so that
 * browsers can reuse resources without re-downloading them on subsequent
 * visits.  Effective caching is one of the most impactful sustainability
 * optimizations — it eliminates redundant data transfer and reduces server
 * load.
 *
 * Headers checked:
 *   - `Cache-Control`   — primary directive (e.g. `max-age`, `s-maxage`)
 *   - `ETag`            — entity tag for conditional revalidation
 *   - `Expires`         — legacy expiry date (lower priority than Cache-Control)
 *
 * Scoring:
 *   - `Cache-Control` with `max-age` / `s-maxage` present       → pass  (100)
 *   - `Cache-Control` present but no `max-age`, or only `ETag`  → warn   (50)
 *   - No caching headers at all                                  → fail    (0)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#optimise-browser-caching
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '4.2'
const GUIDELINE_NAME = 'Optimise Browser Caching'
const SUCCESS_CRITERION =
  'Pages should be served with effective caching headers (Cache-Control with max-age, ETag, or Expires)'
const RESOURCES = ['https://www.w3.org/TR/web-sustainability-guidelines/#optimise-browser-caching']

/** Regex to find a max-age directive in Cache-Control. */
const MAX_AGE_RE = /(?:^|,)\s*max-age\s*=\s*\d+/i
/** Regex to find a s-maxage directive in Cache-Control. */
const S_MAXAGE_RE = /(?:^|,)\s*s-maxage\s*=\s*\d+/i

export const checkCaching: CheckFn = (page) => {
  const headers = page.fetchResult.headers
  const cacheControl = headers['cache-control'] ?? ''
  const etag = headers['etag'] ?? ''
  const expires = headers['expires'] ?? ''

  const hasCacheControl = cacheControl.length > 0
  const hasMaxAge = MAX_AGE_RE.test(cacheControl) || S_MAXAGE_RE.test(cacheControl)
  const hasEtag = etag.length > 0
  const hasExpires = expires.length > 0

  // Best case: Cache-Control with a max-age directive
  if (hasMaxAge) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'Cache-Control header with max-age is present — effective browser caching enabled.',
      impact: 'high',
      category: 'hosting',
      machineTestable: true,
    }
  }

  // Partial caching: Cache-Control without max-age, or only ETag / Expires
  if (hasCacheControl || hasEtag || hasExpires) {
    const found: string[] = []
    if (hasCacheControl) found.push(`Cache-Control: ${cacheControl}`)
    if (hasEtag) found.push('ETag')
    if (hasExpires) found.push(`Expires: ${expires}`)

    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'warn',
      score: 50,
      message: 'Some caching headers present but no explicit max-age directive found.',
      details: `Found: ${found.join('; ')}. Adding a max-age directive to Cache-Control is recommended.`,
      recommendation:
        'Add a Cache-Control header with a max-age directive (e.g. "Cache-Control: max-age=3600, ' +
        'stale-while-revalidate=86400") to enable efficient browser caching. Use longer max-age ' +
        'values for immutable assets (e.g. hashed filenames) and shorter ones for frequently ' +
        'changing HTML documents.',
      resources: RESOURCES,
      impact: 'high',
      category: 'hosting',
      machineTestable: true,
    }
  }

  // No caching headers at all
  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'fail',
    score: 0,
    message: 'No caching headers found (Cache-Control, ETag, or Expires are all absent).',
    details:
      'Without caching headers, browsers must re-download resources on every visit, ' +
      'wasting bandwidth and increasing server load.',
    recommendation:
      'Add Cache-Control headers to all responses. For HTML: "Cache-Control: no-cache" ' +
      '(forces revalidation but allows caching). For versioned assets: ' +
      '"Cache-Control: max-age=31536000, immutable". Include an ETag for conditional ' +
      'revalidation support.',
    resources: RESOURCES,
    impact: 'high',
    category: 'hosting',
    machineTestable: true,
  }
}
