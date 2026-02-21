/**
 * WSG 4.10 – Use A Content Delivery Network
 *
 * Detects whether the page response was delivered via a Content Delivery
 * Network (CDN) by inspecting well-known CDN-specific response headers.
 * CDNs reduce latency by serving resources from edge nodes close to the user,
 * which lowers the energy cost of data transit across long-haul networks.
 *
 * Detection heuristics (any of the following headers being present indicates
 * CDN delivery):
 *   - `cf-ray`             — Cloudflare
 *   - `x-cache`            — many CDNs (Akamai, CloudFront, Varnish…)
 *   - `x-cache-hits`       — Varnish / CDN cache hit count
 *   - `x-served-by`        — Fastly, Varnish
 *   - `x-amz-cf-id`        — Amazon CloudFront
 *   - `x-amz-cf-pop`       — Amazon CloudFront PoP
 *   - `x-fastly-request-id`— Fastly
 *   - `fly-request-id`     — Fly.io
 *   - `age`                — downstream cache age (proxy/CDN indicator)
 *   - `via`                — generic proxy/CDN indicator
 *
 * Scoring:
 *   - One or more CDN headers detected  → pass  (100)
 *   - No CDN headers detected           → warn   (50)
 *
 * The check returns `warn` rather than `fail` because some valid
 * configurations (e.g. self-hosted static sites with edge network hosting)
 * may not set these specific headers while still being efficiently distributed.
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#use-a-content-delivery-network
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '4.10'
const GUIDELINE_NAME = 'Use a Content Delivery Network'
const SUCCESS_CRITERION =
  'Static resources and pages should be delivered via a CDN to reduce data transit energy'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#use-a-content-delivery-network',
]

/** Response header names that reliably indicate CDN delivery. */
const CDN_HEADERS: ReadonlyArray<{ header: string; label: string }> = [
  { header: 'cf-ray', label: 'Cloudflare (cf-ray)' },
  { header: 'x-amz-cf-id', label: 'Amazon CloudFront (x-amz-cf-id)' },
  { header: 'x-amz-cf-pop', label: 'Amazon CloudFront (x-amz-cf-pop)' },
  { header: 'x-fastly-request-id', label: 'Fastly (x-fastly-request-id)' },
  { header: 'x-cache', label: 'CDN cache (x-cache)' },
  { header: 'x-cache-hits', label: 'CDN cache hits (x-cache-hits)' },
  { header: 'x-served-by', label: 'CDN proxy (x-served-by)' },
  { header: 'fly-request-id', label: 'Fly.io (fly-request-id)' },
  { header: 'age', label: 'Downstream cache (age)' },
  { header: 'via', label: 'Proxy/CDN (via)' },
]

export const checkCdnUsage: CheckFn = (page) => {
  const headers = page.fetchResult.headers

  const detected = CDN_HEADERS.filter(({ header }) => header in headers)

  if (detected.length > 0) {
    const indicators = detected.map((d) => d.label).join(', ')

    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `CDN delivery detected via response headers: ${indicators}.`,
      details: `CDN indicator header(s) found: ${indicators}`,
      impact: 'medium',
      category: 'hosting',
      machineTestable: true,
    }
  }

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'warn',
    score: 50,
    message:
      'No CDN indicator headers detected — the page may not be served from a distributed edge network.',
    details:
      'None of the well-known CDN response headers were found. This does not definitively ' +
      'rule out a CDN, but it suggests the response may originate directly from the origin server.',
    recommendation:
      'Consider using a CDN to serve your site from edge nodes close to your users. ' +
      'CDNs reduce data transit over long-haul backbone networks, lowering latency and ' +
      'the energy cost of delivery. Many static hosting providers (Netlify, Vercel, ' +
      'Cloudflare Pages) include CDN distribution by default.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'hosting',
    machineTestable: true,
  }
}
