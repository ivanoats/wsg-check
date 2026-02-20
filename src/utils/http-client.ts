/**
 * HTTP client for wsg-check.
 *
 * Features:
 *   - In-memory response cache (avoids duplicate fetches for the same URL)
 *   - Configurable timeout, retry with exponential back-off, and user-agent
 *   - Respects robots.txt (WSG 4.6)
 *   - Records the full redirect chain (WSG 4.4)
 */

import axios, { AxiosError, type AxiosInstance, type AxiosResponse } from 'axios'
import robotsParser from 'robots-parser'
import { FetchError, type Result, ok, err } from './errors.js'

// ─── Public types ─────────────────────────────────────────────────────────────

/** A single step in an HTTP redirect chain. */
export interface RedirectEntry {
  /** URL that issued the redirect. */
  url: string
  /** HTTP status code of the redirect response (3xx). */
  statusCode: number
  /** Value of the `Location` response header. */
  location: string
}

/** The result of a successful HTTP fetch. */
export interface FetchResult {
  /** Final URL after all redirects. */
  url: string
  /** Original URL that was requested. */
  originalUrl: string
  statusCode: number
  headers: Record<string, string>
  body: string
  redirectChain: RedirectEntry[]
  /** `true` when the result was served from the in-memory cache. */
  fromCache: boolean
  /**
   * Transfer size in bytes as reported by the `Content-Length` response header.
   * This is the **compressed** size when `Content-Encoding` is present, giving an
   * accurate picture of network bandwidth used (relevant for sustainability metrics).
   * Falls back to the decompressed body byte-length when the header is absent
   * (e.g. chunked transfer encoding).
   */
  contentLength: number
  contentEncoding?: string
  contentType?: string
}

export interface HttpClientOptions {
  /** Request timeout in milliseconds. Defaults to 30 000. */
  timeout?: number
  userAgent?: string
  /** Whether to follow HTTP redirects. Defaults to `true`. */
  followRedirects?: boolean
  /** Number of retry attempts on transient errors. Defaults to 2. */
  maxRetries?: number
  /** Base delay in ms between retries (multiplied by attempt number). Defaults to 500. */
  retryDelay?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: Required<HttpClientOptions> = {
  timeout: 30_000,
  userAgent: 'Mozilla/5.0 (compatible; wsg-check/0.0.1; +https://github.com/ivanoats/wsg-check)',
  followRedirects: true,
  maxRetries: 2,
  retryDelay: 500,
}

const MAX_REDIRECTS = 10

// ─── HttpClient ───────────────────────────────────────────────────────────────

export class HttpClient {
  private readonly axiosInstance: AxiosInstance
  private readonly opts: Required<HttpClientOptions>
  private readonly cache = new Map<string, FetchResult>()
  private readonly robotsCache = new Map<string, ReturnType<typeof robotsParser>>()

  constructor(options: HttpClientOptions = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options }

    this.axiosInstance = axios.create({
      timeout: this.opts.timeout,
      headers: { 'User-Agent': this.opts.userAgent },
      // Always disable automatic redirect following so we can track the chain.
      maxRedirects: 0,
      // Never throw on non-2xx so we can inspect redirect responses ourselves.
      validateStatus: () => true,
      decompress: true,
    })
  }

  // ── robots.txt ──────────────────────────────────────────────────────────────

  /** Fetch and cache the robots.txt rules for the given origin. */
  private async fetchRobotsTxtRules(origin: string): Promise<ReturnType<typeof robotsParser>> {
    const cached = this.robotsCache.get(origin)
    if (cached) return cached

    const robotsUrl = `${origin}/robots.txt`
    try {
      const resp = await this.axiosInstance.get<string>(robotsUrl, {
        responseType: 'text',
        timeout: 5_000,
      })
      if (resp.status === 200 && typeof resp.data === 'string') {
        const robots = robotsParser(robotsUrl, resp.data)
        this.robotsCache.set(origin, robots)
        return robots
      }
    } catch {
      // If the robots.txt cannot be fetched, allow all by default.
    }

    const allowAll = robotsParser(robotsUrl, '')
    this.robotsCache.set(origin, allowAll)
    return allowAll
  }

  /** Return `true` if the URL is permitted by the site's robots.txt. */
  async isAllowedByRobots(url: string): Promise<boolean> {
    const parsed = new URL(url)
    const robots = await this.fetchRobotsTxtRules(parsed.origin)
    return robots.isAllowed(url, this.opts.userAgent) !== false
  }

  // ── Public fetch ────────────────────────────────────────────────────────────

  /**
   * Fetch a URL and return a `Result` — no exceptions are thrown.
   *
   * - Returns `{ ok: true, value: FetchResult }` on success.
   * - Returns `{ ok: false, error: FetchError }` on any failure (robots.txt
   *   disallow, network error, too many redirects, etc.).
   * - Served from the in-memory cache on duplicate requests (`fromCache: true`).
   * - Follows redirects and records each hop in `redirectChain`.
   * - Retries on transient network errors with exponential back-off.
   */
  async fetch(
    url: string,
    options?: { ignoreRobots?: boolean }
  ): Promise<Result<FetchResult, FetchError>> {
    const cached = this.cache.get(url)
    if (cached) return ok({ ...cached, fromCache: true })

    if (!options?.ignoreRobots) {
      const allowed = await this.isAllowedByRobots(url)
      if (!allowed) {
        return err(new FetchError(`URL disallowed by robots.txt: ${url}`, url))
      }
    }

    try {
      const result = await this.fetchWithRetry(url)
      this.cache.set(url, result)
      return ok(result)
    } catch (e) {
      return err(e instanceof FetchError ? e : new FetchError(String(e), url, e))
    }
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private async fetchWithRetry(url: string, attempt = 0): Promise<FetchResult> {
    try {
      return await this.fetchFollowingRedirects(url)
    } catch (err) {
      if (attempt < this.opts.maxRetries && this.isRetryable(err)) {
        await this.sleep(this.opts.retryDelay * (attempt + 1))
        return this.fetchWithRetry(url, attempt + 1)
      }
      if (err instanceof FetchError) throw err
      const msg = err instanceof Error ? err.message : String(err)
      throw new FetchError(`Failed to fetch ${url}: ${msg}`, url, err)
    }
  }

  /**
   * Follow redirects manually so that each hop can be recorded.
   * Raises `FetchError` after more than `MAX_REDIRECTS` hops.
   */
  private async fetchFollowingRedirects(startUrl: string): Promise<FetchResult> {
    const redirectChain: RedirectEntry[] = []
    let currentUrl = startUrl

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const resp = await this.axiosInstance.get<string>(currentUrl, {
        responseType: 'text',
      })

      if (resp.status >= 300 && resp.status < 400) {
        if (!this.opts.followRedirects) {
          // Caller asked not to follow – return the redirect response as-is.
          return this.buildResult(startUrl, currentUrl, resp, redirectChain)
        }

        const location = (resp.headers as Record<string, string>)['location']
        if (!location) {
          throw new FetchError(
            `Redirect response (${resp.status}) missing Location header at ${currentUrl}`,
            startUrl
          )
        }

        redirectChain.push({ url: currentUrl, statusCode: resp.status, location })

        // Resolve relative Location values against the current URL.
        currentUrl = new URL(location, currentUrl).href
        continue
      }

      return this.buildResult(startUrl, currentUrl, resp, redirectChain)
    }

    throw new FetchError(`Too many redirects (> ${MAX_REDIRECTS}) for ${startUrl}`, startUrl)
  }

  private buildResult(
    originalUrl: string,
    finalUrl: string,
    resp: AxiosResponse<string>,
    redirectChain: RedirectEntry[]
  ): FetchResult {
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(resp.headers as Record<string, unknown>)) {
      if (typeof value === 'string') {
        headers[key] = value
      } else if (Array.isArray(value)) {
        headers[key] = (value as string[]).join(', ')
      }
    }

    const body = typeof resp.data === 'string' ? resp.data : String(resp.data)

    // Prefer the Content-Length header so the value reflects the compressed
    // transfer size (accurate bandwidth metric for sustainability analysis).
    // Fall back to body byte-length when the header is absent (chunked transfer).
    const headerContentLength = headers['content-length']
    const contentLength =
      headerContentLength !== undefined
        ? parseInt(headerContentLength, 10) || body.length
        : body.length

    return {
      url: finalUrl,
      originalUrl,
      statusCode: resp.status,
      headers,
      body,
      redirectChain,
      fromCache: false,
      contentLength,
      contentEncoding: headers['content-encoding'],
      contentType: headers['content-type'],
    }
  }

  private isRetryable(err: unknown): boolean {
    if (err instanceof AxiosError) {
      // Retry on network errors or 5xx responses
      return !err.response || err.response.status >= 500
    }
    return true
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // ── Cache management ────────────────────────────────────────────────────────

  /** Clear the cached HTTP responses. */
  clearCache(): void {
    this.cache.clear()
  }

  /** Clear the cached robots.txt rules. */
  clearRobotsCache(): void {
    this.robotsCache.clear()
  }
}
