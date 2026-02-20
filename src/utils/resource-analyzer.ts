/**
 * Resource analyzer for wsg-check.
 *
 * Aggregates the resource data collected during fetching and parsing into
 * higher-level sustainability metrics:
 *   - Total page weight in bytes
 *   - Resource counts and breakdown by type
 *   - First-party vs. third-party resource classification
 *   - Compression detection from HTTP response headers
 */

import type { FetchResult } from './http-client.js'
import type { ParsedPage, ResourceReference, ResourceType } from './html-parser.js'

// ─── Public types ─────────────────────────────────────────────────────────────

/** A resource reference annotated with third-party classification. */
export interface ResourceInfo {
  url: string
  type: ResourceType
  /** `true` when the resource is served from a different origin than the page. */
  isThirdParty: boolean
}

/** Compression status derived from HTTP response headers. */
export interface CompressionInfo {
  isCompressed: boolean
  /** Encoding type (e.g. `"gzip"`, `"br"`, `"zstd"`), or `undefined`. */
  type?: string
}

/**
 * Aggregate page weight and resource breakdown metrics for a single page.
 */
export interface PageWeightAnalysis {
  /** Byte size of the HTML response body. */
  htmlSize: number
  /**
   * Total known resource count (HTML + all referenced resources).
   * Byte sizes of sub-resources are not available without fetching each one;
   * use `htmlSize` as the baseline and interpret `resourceCount` as a proxy.
   */
  resourceCount: number
  /** Number of resources served from first-party origins. */
  firstPartyCount: number
  /** Number of resources served from third-party origins. */
  thirdPartyCount: number
  /** Whether the HTML response was delivered with content encoding. */
  compression: CompressionInfo
  /** Count of resources per type. */
  byType: Record<ResourceType, number>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the eTLD+1 "site" from a URL for third-party classification.
 *
 * Uses a simple heuristic: strip the leading `www.` subdomain and keep the
 * last two label segments (e.g. `example.com`).
 *
 * **Known limitation:** This heuristic is intentionally lightweight and does
 * not consult a Public Suffix List (PSL).  It will incorrectly group resources
 * that share only a country-code second-level domain (e.g. resources on both
 * `foo.co.uk` and `bar.co.uk` will be treated as first-party to each other).
 * For now this trade-off is acceptable; a future iteration can integrate the
 * `psl` npm package for accurate eTLD+1 extraction.
 */
function getSite(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    const parts = hostname.split('.')
    return parts.length >= 2 ? parts.slice(-2).join('.') : hostname
  } catch {
    return url
  }
}

// ─── Exported functions ───────────────────────────────────────────────────────

/**
 * Classify each resource in `parsedPage.resources` as first-party or
 * third-party relative to `originUrl`.
 */
export function classifyResources(
  resources: ResourceReference[],
  originUrl: string
): ResourceInfo[] {
  const originSite = getSite(originUrl)

  return resources.map((ref) => ({
    url: ref.url,
    type: ref.type,
    isThirdParty: getSite(ref.url) !== originSite,
  }))
}

/**
 * Derive compression information from an HTTP response's headers.
 *
 * Checks both `Content-Encoding` (transfer encoding applied by the server)
 * and `Vary: Accept-Encoding` as a secondary indicator.
 */
export function analyzeCompression(headers: Record<string, string>): CompressionInfo {
  const encoding = (headers['content-encoding'] ?? '').toLowerCase().trim()

  if (encoding === 'gzip' || encoding === 'x-gzip') {
    return { isCompressed: true, type: 'gzip' }
  }
  if (encoding === 'br') {
    return { isCompressed: true, type: 'br' }
  }
  if (encoding === 'zstd') {
    return { isCompressed: true, type: 'zstd' }
  }
  if (encoding === 'deflate') {
    return { isCompressed: true, type: 'deflate' }
  }
  if (encoding !== '') {
    return { isCompressed: true, type: encoding }
  }

  return { isCompressed: false }
}

/**
 * Produce a `PageWeightAnalysis` from the HTTP fetch result and parsed page.
 *
 * Sub-resource sizes are not independently fetched here; the analysis is
 * intentionally lightweight and based on what is observable from the initial
 * HTML response.
 */
export function analyzePageWeight(
  fetchResult: FetchResult,
  parsedPage: ParsedPage,
  originUrl?: string
): PageWeightAnalysis {
  const htmlSize = fetchResult.contentLength

  const origin = originUrl ?? fetchResult.url

  const classified = classifyResources(parsedPage.resources, origin)

  const byType: Record<ResourceType, number> = {
    stylesheet: 0,
    script: 0,
    image: 0,
    font: 0,
    media: 0,
    other: 0,
  }

  let firstPartyCount = 0
  let thirdPartyCount = 0

  for (const r of classified) {
    byType[r.type] = (byType[r.type] ?? 0) + 1
    if (r.isThirdParty) {
      thirdPartyCount++
    } else {
      firstPartyCount++
    }
  }

  return {
    htmlSize,
    resourceCount: classified.length,
    firstPartyCount,
    thirdPartyCount,
    compression: analyzeCompression(fetchResult.headers),
    byType,
  }
}
