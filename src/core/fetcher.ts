/**
 * Page fetcher for wsg-check.
 *
 * Orchestrates the HTTP fetch and HTML parse steps, returning a unified
 * `PageData` object that is ready to be passed to the `CheckRunner`.
 *
 * This is the primary "inbound port" in the hexagonal architecture: all
 * external I/O (network, robots.txt) is confined here, keeping the check
 * functions and scorer free of side-effects.
 */

import { HttpClient, type HttpClientOptions } from '../utils/http-client.js'
import { parseHtml } from '../utils/html-parser.js'
import { analyzePageWeight } from '../utils/resource-analyzer.js'
import { FetchError, ParseError, type Result, ok, err } from '../utils/errors.js'
import type { PageData } from './types.js'

// ─── PageFetcher ──────────────────────────────────────────────────────────────

/**
 * Fetches a URL and returns a fully populated `PageData` object.
 *
 * Internally it:
 *   1. Uses `HttpClient` to fetch the HTML (with caching, robots.txt, retries).
 *   2. Parses the HTML body with `parseHtml`.
 *   3. Derives page-weight metrics with `analyzePageWeight`.
 *
 * All three steps must succeed for a `PageData` to be returned; otherwise a
 * typed error is returned and **nothing is thrown**.
 */
export class PageFetcher {
  private readonly client: HttpClient

  constructor(options?: HttpClientOptions) {
    this.client = new HttpClient(options)
  }

  /**
   * Fetch a URL and build the page data bundle.
   *
   * @param url           The page URL to analyse.
   * @param options.ignoreRobots  Skip robots.txt check (default: `false`).
   *
   * @returns `{ ok: true, value: PageData }` on success, or
   *          `{ ok: false, error: FetchError | ParseError }` on failure.
   */
  async fetch(
    url: string,
    options?: { ignoreRobots?: boolean }
  ): Promise<Result<PageData, FetchError | ParseError>> {
    const fetchResult = await this.client.fetch(url, options)
    if (!fetchResult.ok) {
      return fetchResult
    }

    let parsedPage
    try {
      parsedPage = parseHtml(fetchResult.value.body, fetchResult.value.url)
    } catch (e) {
      return err(e instanceof ParseError ? e : new ParseError('Failed to parse HTML', e))
    }

    const pageWeight = analyzePageWeight(fetchResult.value, parsedPage, url)

    return ok({
      url,
      fetchResult: fetchResult.value,
      parsedPage,
      pageWeight,
    })
  }

  /** Expose cache-clearing for testing / memory management. */
  clearCache(): void {
    this.client.clearCache()
  }
}
