/**
 * WSG 4.7 – Ensure Appropriate Data Refresh Rates (Cache TTL)
 *
 * Inspects the `Cache-Control` header to assess whether the page's cache
 * time-to-live (TTL) is appropriately set for sustainable delivery:
 *
 *   - **Very short TTLs** (< 60 seconds for non-real-time content) force
 *     clients to revalidate almost every request, generating unnecessary
 *     network traffic.
 *   - **No TTL / no-store** means the response cannot be cached at all,
 *     maximizing bandwidth use.
 *   - **Reasonable TTLs** (≥ 60 seconds) allow browsers and CDN edge nodes
 *     to cache the response, reducing redundant data transfer.
 *
 * Scoring:
 *   - `no-store` directive present                         → fail    (0)
 *   - max-age or s-maxage < 60 s                           → fail    (0)
 *   - max-age or s-maxage 60 s – 299 s                     → warn   (50)
 *   - max-age or s-maxage ≥ 300 s                          → pass  (100)
 *   - No Cache-Control or no max-age directive             → warn   (50)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#ensure-appropriate-data-refresh-rates
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '4.7'
const GUIDELINE_NAME = 'Ensure Appropriate Data Refresh Rates'
const SUCCESS_CRITERION =
  'Pages should use appropriate Cache-Control TTLs to minimise unnecessary revalidation requests'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#ensure-appropriate-data-refresh-rates',
]

/** Minimum TTL (seconds) for a "pass" result. */
const PASS_MIN_SECONDS = 300

/** Minimum TTL (seconds) for a "warn" result (below this → fail). */
const WARN_MIN_SECONDS = 60

/** Regex to extract s-maxage value from Cache-Control (CDN TTL, takes precedence). */
const S_MAXAGE_RE = /(?:^|,)\s*s-maxage\s*=\s*(\d+)/i
/** Regex to extract max-age value from Cache-Control. */
const MAX_AGE_RE = /(?:^|,)\s*max-age\s*=\s*(\d+)/i

/**
 * Extract the effective TTL (in seconds) from a Cache-Control header value.
 * Prefers `s-maxage` (CDN TTL) over `max-age` (browser TTL).
 * Returns `null` if neither directive is present.
 */
const extractMaxAge = (cacheControl: string): number | null => {
  const sMaxAgeMatch = S_MAXAGE_RE.exec(cacheControl)
  if (sMaxAgeMatch) return parseInt(sMaxAgeMatch[1], 10)

  const maxAgeMatch = MAX_AGE_RE.exec(cacheControl)
  if (maxAgeMatch) return parseInt(maxAgeMatch[1], 10)

  return null
}

export const checkDataRefresh: CheckFn = (page) => {
  const cacheControl = (page.fetchResult.headers['cache-control'] ?? '').toLowerCase()

  // no-store prevents all caching
  if (cacheControl.includes('no-store')) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'fail',
      score: 0,
      message:
        'Cache-Control: no-store prevents all caching — every visit downloads the full response.',
      details: `Cache-Control: ${page.fetchResult.headers['cache-control']}`,
      recommendation:
        'Avoid no-store for HTML pages unless the content is genuinely user-specific and ' +
        'sensitive (e.g. authenticated dashboards). For public pages, use "no-cache" with ' +
        'an ETag to allow revalidation without forcing a full re-download.',
      resources: RESOURCES,
      impact: 'medium',
      category: 'hosting',
      machineTestable: true,
    }
  }

  const maxAge = extractMaxAge(cacheControl)

  if (maxAge === null) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'warn',
      score: 50,
      message: 'No max-age or s-maxage directive found in Cache-Control — TTL is unspecified.',
      details:
        cacheControl.length > 0
          ? `Cache-Control: ${page.fetchResult.headers['cache-control']}`
          : 'No Cache-Control header present.',
      recommendation:
        'Add a max-age directive to Cache-Control to specify how long the response can be ' +
        'cached. For frequently updated HTML: "Cache-Control: no-cache, must-revalidate" ' +
        'paired with an ETag. For versioned static assets: "Cache-Control: max-age=31536000, immutable".',
      resources: RESOURCES,
      impact: 'medium',
      category: 'hosting',
      machineTestable: true,
    }
  }

  if (maxAge < WARN_MIN_SECONDS) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'fail',
      score: 0,
      message: `Cache TTL is very short (${maxAge}s) — clients will revalidate almost every request.`,
      details: `Effective max-age: ${maxAge} seconds (< ${WARN_MIN_SECONDS}s threshold). Cache-Control: ${page.fetchResult.headers['cache-control']}`,
      recommendation:
        `Increase the Cache-Control max-age to at least ${WARN_MIN_SECONDS} seconds for non-real-time ` +
        'content to reduce unnecessary revalidation requests. For content that updates infrequently, ' +
        'consider values of 3600 (1 hour) or higher.',
      resources: RESOURCES,
      impact: 'medium',
      category: 'hosting',
      machineTestable: true,
    }
  }

  if (maxAge < PASS_MIN_SECONDS) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'warn',
      score: 50,
      message: `Cache TTL of ${maxAge}s is short — consider increasing it to reduce revalidation frequency.`,
      details: `Effective max-age: ${maxAge} seconds. Cache-Control: ${page.fetchResult.headers['cache-control']}`,
      recommendation:
        `A TTL of ${maxAge} seconds means browsers revalidate every ${maxAge} seconds. For ` +
        'pages that do not change on every request, increasing max-age to 300 s or more ' +
        'reduces server load and unnecessary network traffic.',
      resources: RESOURCES,
      impact: 'medium',
      category: 'hosting',
      machineTestable: true,
    }
  }

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'pass',
    score: 100,
    message: `Cache TTL of ${maxAge}s is appropriate — browsers and CDNs can cache this response effectively.`,
    details: `Effective max-age: ${maxAge} seconds (≥ ${PASS_MIN_SECONDS}s). Cache-Control: ${page.fetchResult.headers['cache-control']}`,
    impact: 'medium',
    category: 'hosting',
    machineTestable: true,
  }
}
