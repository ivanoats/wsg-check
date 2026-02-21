/**
 * WSG 4.4 – Avoid Unnecessary or Excessive Redirects
 *
 * Analyses the redirect chain recorded during the page fetch to detect
 * problems that waste user bandwidth and add latency:
 *
 *   - **Redirect chains** — each hop adds a full round-trip; chains of 3 or
 *     more hops have a significant performance and sustainability impact.
 *   - **Temporary vs permanent redirects** — 302 (temporary) redirects cannot
 *     be cached by browsers, so the redirect round-trip is repeated on every
 *     visit.  301 (permanent) redirects are cached and are preferable for
 *     stable URL changes.
 *
 * Scoring:
 *   - 0 redirects                                          → pass  (100)
 *   - 1–2 redirects, all 301                               → pass  (100)
 *   - 1–2 redirects with at least one 302/307 (temporary)    → warn   (50)
 *   - 3+ redirects (chain)                                 → fail    (0)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#avoid-unnecessary-or-excessive-redirects
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '4.4'
const GUIDELINE_NAME = 'Avoid Unnecessary or Excessive Redirects'
const SUCCESS_CRITERION =
  'Pages should be accessible without redirect chains; permanent 301 redirects are preferred over temporary 302s'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#avoid-unnecessary-or-excessive-redirects',
]

/** Threshold above which a redirect chain is considered excessive. */
const REDIRECT_CHAIN_THRESHOLD = 3

/** Status codes that are "cacheable" permanent redirects. */
const PERMANENT_REDIRECT_CODES = new Set([301, 308])

export const checkRedirects: CheckFn = (page) => {
  const { redirectChain } = page.fetchResult

  if (redirectChain.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'No redirects detected — the URL resolves directly.',
      impact: 'medium',
      category: 'hosting',
      machineTestable: true,
    }
  }

  // Check for excessive redirect chains
  if (redirectChain.length >= REDIRECT_CHAIN_THRESHOLD) {
    const chain = redirectChain.map((r) => `${r.statusCode} ${r.url} → ${r.location}`).join('\n')

    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'fail',
      score: 0,
      message: `Redirect chain of ${redirectChain.length} hops detected — each hop wastes a full round-trip.`,
      details: `Redirect chain:\n${chain}`,
      recommendation:
        'Collapse the redirect chain so that the original URL resolves in a single redirect ' +
        '(or ideally no redirect at all). Update all internal links and canonical tags to ' +
        'point directly to the final URL. Use 301 (Moved Permanently) for stable redirects ' +
        'so that browsers can cache them.',
      resources: RESOURCES,
      impact: 'medium',
      category: 'hosting',
      machineTestable: true,
    }
  }

  // 1–2 redirects — check whether they are permanent
  const hasTemporary = redirectChain.some((r) => !PERMANENT_REDIRECT_CODES.has(r.statusCode))

  if (hasTemporary) {
    const temporaryHops = redirectChain
      .filter((r) => !PERMANENT_REDIRECT_CODES.has(r.statusCode))
      .map((r) => `${r.statusCode} ${r.url}`)
      .join(', ')

    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'warn',
      score: 50,
      message: `${redirectChain.length} redirect(s) detected, including temporary redirect(s) that cannot be cached.`,
      details: `Temporary redirects: ${temporaryHops}`,
      recommendation:
        'Replace temporary (302/307) redirects with permanent (301/308) redirects when the ' +
        'destination URL is stable. Permanent redirects are cached by browsers, eliminating ' +
        'the round-trip on subsequent visits.',
      resources: RESOURCES,
      impact: 'medium',
      category: 'hosting',
      machineTestable: true,
    }
  }

  // 1–2 permanent redirects only
  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'pass',
    score: 100,
    message: `${redirectChain.length} permanent redirect(s) detected — these are cached by browsers.`,
    details: `Redirect chain length: ${redirectChain.length}. All redirects use permanent (301/308) status codes.`,
    impact: 'medium',
    category: 'hosting',
    machineTestable: true,
  }
}
