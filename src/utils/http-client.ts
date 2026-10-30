/**
 * HTTP client for wsg-check.
 *
 * Features:
 *   - In-memory response cache (avoids duplicate fetches for the same URL)
 *   - Configurable timeout, retry with exponential back-off, and user-agent
 *   - Respects robots.txt (WSG 4.6)
 *   - Records the full redirect chain (WSG 4.4)
 *   - Optional per-request headers, scoped to the start URL's host
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import robotsParser from 'robots-parser'
import { FetchError, type Result, ok, err } from './errors'
import { isDisallowedHost, dnsResolvesToPrivateAddress } from './ssrf'
import { createPinnedLookup, evaluateUrl, type AddressClass, type HostPolicy } from './host-policy'
import { VERSION } from '../version'

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
   * Transfer size: bytes of the final response body as received over the network,
   * counted before decompression. This is the **compressed** size when
   * `Content-Encoding` is present, and it does not depend on whether the server
   * sent a `Content-Length` header or used chunked transfer encoding.
   */
  contentLength: number
  /**
   * Byte length of the body after decompression and before text decoding, so it
   * is exact for any charset. Set on every fetched response.
   */
  bodyByteLength?: number
  /** `Content-Encoding` as sent by the server, even after axios strips it. */
  contentEncoding?: string
  contentType?: string
  /**
   * `Sitemap:` URLs from the requested origin's robots.txt. Empty if it declared
   * none or didn't return 200; absent if robots.txt was skipped (`ignoreRobots`).
   * A cached result keeps the value from the fetch that filled the cache.
   */
  robotsSitemaps?: ReadonlyArray<string>
  /**
   * Beneficial files (`security.txt`, `humans.txt`, `carbon.txt`) that answered
   * 200 with a non-HTML content type at a standard path on the final URL's
   * origin. Absent when not probed.
   */
  standardFiles?: ReadonlyArray<string>
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
  /**
   * Network access policy applied to the initial URL (before robots.txt is
   * fetched) and to every redirect hop. When omitted, only redirect hops are
   * checked, by name and by DNS, and private or loopback targets are refused.
   * The one exception is a hop that stays on a start host the caller named as
   * local (`localhost`, `*.local`, or a private IP literal).
   */
  hostPolicy?: HostPolicy
  /** Aborts in-flight requests and stops retries, e.g. when a caller cancels. */
  signal?: AbortSignal
  /** Extra headers (e.g. a Cookie) for the page fetch. Not sent to robots.txt, other hosts, or over plain http after an https hop. */
  headers?: Readonly<Record<string, string>>
}

// ─── Constants ────────────────────────────────────────────────────────────────

type DefaultedOptions = Required<Omit<HttpClientOptions, 'hostPolicy' | 'signal' | 'headers'>>

const DEFAULT_OPTIONS: DefaultedOptions = {
  timeout: 30_000,
  userAgent: `Mozilla/5.0 (compatible; wsg-check/${VERSION}; +https://github.com/ivanoats/wsg-check)`,
  followRedirects: true,
  maxRetries: 2,
  retryDelay: 500,
}

const MAX_REDIRECTS = 10

// ─── Response headers ─────────────────────────────────────────────────────────

/** Shape of axios's Node adapter request: `ClientRequest.res` is the `IncomingMessage`. */
interface RawHeaderSource {
  readonly res?: { readonly rawHeaders?: ReadonlyArray<string> }
}

/**
 * Reads a header from the raw Node response headers. `name` must be lower-case.
 * Returns `undefined` without a Node response (XHR or fetch adapters, mocks).
 */
const rawHeaderValue = (request: unknown, name: string): string | undefined => {
  const raw = (request as RawHeaderSource | undefined)?.res?.rawHeaders ?? []
  const index = raw.findIndex((entry, i) => i % 2 === 0 && entry.toLowerCase() === name)
  return index === -1 ? undefined : raw[index + 1]
}

const responseHeaders = (resp: AxiosResponse<unknown>): Record<string, string> => {
  const headers: Record<string, string> = Object.fromEntries(
    Object.entries(resp.headers as Record<string, unknown>).flatMap(([key, value]) => {
      if (typeof value === 'string') return [[key, value]]
      if (Array.isArray(value)) return [[key, (value as string[]).join(', ')]]
      return []
    })
  )

  // axios deletes Content-Encoding after decompressing; the compression check needs it.
  if (headers['content-encoding'] !== undefined) return headers
  const recovered = rawHeaderValue(resp.request, 'content-encoding')
  return recovered === undefined ? headers : { ...headers, 'content-encoding': recovered }
}

/** Response body as bytes: a Buffer from the Node adapter, an ArrayBuffer elsewhere, a string from mocks. */
const toBuffer = (data: unknown): Buffer => {
  if (Buffer.isBuffer(data)) return data
  if (data instanceof ArrayBuffer) return Buffer.from(data)
  return typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.alloc(0)
}

// ─── Request headers ──────────────────────────────────────────────────────────

/**
 * Headers for one hop: the configured set only if it stays on the start
 * URL's hostname and is not a plaintext hop after any https hop, else none.
 * `priorHops` are the redirects already followed in this chain.
 */
export const requestHeaders = (
  headers: Readonly<Record<string, string>>,
  startUrl: string,
  currentUrl: string,
  priorHops: ReadonlyArray<string>
): { headers?: Readonly<Record<string, string>> } => {
  if (Object.keys(headers).length === 0) return {}
  const start = new URL(startUrl)
  const current = new URL(currentUrl)
  const sameHost = current.hostname === start.hostname
  // The start URL alone cannot tell whether the chain has already moved to
  // https (http -> https -> http), so look at every earlier hop.
  const isHttps = (url: string): boolean => new URL(url).protocol === 'https:'
  const downgraded = current.protocol === 'http:' && [startUrl, ...priorHops].some(isHttps)
  return sameHost && !downgraded ? { headers } : {}
}
/**
 * Where each beneficial file is published. RFC 9116 defines only the
 * /.well-known/ path for security.txt and requires text/plain; carbontxt.org
 * accepts the site root or /.well-known/.
 */
const STANDARD_FILE_PATHS: ReadonlyArray<{ name: string; path: string; plainTextOnly?: true }> = [
  { name: 'security.txt', path: '/.well-known/security.txt', plainTextOnly: true },
  { name: 'humans.txt', path: '/humans.txt' },
  { name: 'carbon.txt', path: '/carbon.txt' },
  { name: 'carbon.txt', path: '/.well-known/carbon.txt' },
]
const PROBE_TIMEOUT_MS = 5_000
const PROBE_MAX_BYTES = 64 * 1024
/** Content types a single-page app's catch-all route answers unknown paths with. */
const HTML_TYPES = new Set(['text/html', 'application/xhtml+xml'])

// ─── HttpClient ───────────────────────────────────────────────────────────────

export class HttpClient {
  private readonly axiosInstance: AxiosInstance
  private readonly opts: DefaultedOptions
  private readonly hostPolicy?: HostPolicy
  private readonly signal?: AbortSignal
  // Kept off the axios instance, which robots.txt and every hop share.
  private readonly extraHeaders: Readonly<Record<string, string>>
  private readonly cache = new Map<string, FetchResult>()
  private readonly robotsCache = new Map<string, ReturnType<typeof robotsParser>>()

  constructor(options: HttpClientOptions = {}) {
    const { hostPolicy, signal, headers, ...rest } = options
    // Ignore options passed as `undefined` so they don't erase the defaults
    // (WsgChecker forwards unset config fields as `undefined`).
    const provided = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => value !== undefined)
    ) as Partial<typeof DEFAULT_OPTIONS>
    this.opts = { ...DEFAULT_OPTIONS, ...provided }
    this.hostPolicy = hostPolicy
    this.signal = signal
    this.extraHeaders = headers ?? {}

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

  /**
   * Per-request options: the caller's abort signal, and a DNS lookup that pins
   * the connection to the address class the host policy approved.
   */
  private connectOptions(addressClass: AddressClass | undefined): {
    lookup?: ReturnType<typeof createPinnedLookup>
    signal?: AbortSignal
  } {
    return {
      ...(this.hostPolicy && addressClass ? { lookup: createPinnedLookup(addressClass) } : {}),
      ...(this.signal ? { signal: this.signal } : {}),
    }
  }

  /** Fetch and cache the robots.txt rules for the given origin. */
  private async fetchRobotsTxtRules(
    origin: string,
    addressClass?: AddressClass
  ): Promise<ReturnType<typeof robotsParser>> {
    const cached = this.robotsCache.get(origin)
    if (cached) return cached

    const robotsUrl = `${origin}/robots.txt`
    try {
      const resp = await this.axiosInstance.get<string>(robotsUrl, {
        responseType: 'text',
        timeout: 5_000,
        ...this.connectOptions(addressClass),
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

  /**
   * Return `true` if the URL is permitted by the site's robots.txt.
   *
   * @param addressClass - The class the host policy approved for this host, so
   *                       the robots.txt request is pinned to it too.
   */
  async isAllowedByRobots(url: string, addressClass?: AddressClass): Promise<boolean> {
    const parsed = new URL(url)
    const robots = await this.fetchRobotsTxtRules(parsed.origin, addressClass)
    return robots.isAllowed(url, this.opts.userAgent) !== false
  }

  /** Sitemap URLs from the cached robots.txt of `url`'s origin, if it was consulted. */
  private robotsSitemapsFor(url: string): ReadonlyArray<string> | undefined {
    return this.robotsCache.get(new URL(url).origin)?.getSitemaps()
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

    let startClass: AddressClass | undefined
    if (this.hostPolicy) {
      const decision = await evaluateUrl(url, this.hostPolicy)
      if (!decision.allowed) {
        return err(new FetchError(`Host not allowed (${decision.reason}): ${url}`, url))
      }
      startClass = decision.addressClass
    }

    if (!options?.ignoreRobots) {
      const allowed = await this.isAllowedByRobots(url, startClass)
      if (!allowed) {
        return err(new FetchError(`URL disallowed by robots.txt: ${url}`, url))
      }
    }

    if (this.signal?.aborted) {
      return err(new FetchError(`Request aborted: ${url}`, url))
    }

    try {
      const fetched = await this.fetchWithRetry(url, startClass)
      const standardFiles = await this.findStandardFiles(fetched, startClass)
      const robotsSitemaps = options?.ignoreRobots ? undefined : this.robotsSitemapsFor(url)
      const withFiles = { ...fetched, standardFiles }
      // An empty array is kept: it records that robots.txt was consulted.
      const result = robotsSitemaps ? { ...withFiles, robotsSitemaps } : withFiles
      this.cache.set(url, result)
      return ok(result)
    } catch (e) {
      return err(e instanceof FetchError ? e : new FetchError(String(e), url, e))
    }
  }

  // ── Standard file paths ─────────────────────────────────────────────────────

  /**
   * Requests the beneficial files' standard paths on the origin of the page
   * that was actually fetched, so a redirect to another site is judged by that
   * site's files.
   */
  private async findStandardFiles(
    page: FetchResult,
    startClass: AddressClass | undefined
  ): Promise<string[]> {
    const origin = new URL(page.url).origin
    let addressClass = startClass
    if (this.hostPolicy && origin !== new URL(page.originalUrl).origin) {
      // The redirect guard approved this host; re-evaluate to pin the probes to its class.
      const decision = await evaluateUrl(page.url, this.hostPolicy).catch(() => undefined)
      if (!decision?.allowed) return []
      addressClass = decision.addressClass
    }

    const found = await Promise.all(
      STANDARD_FILE_PATHS.map(async ({ name, path, plainTextOnly }) =>
        (await this.servesTextFile(`${origin}${path}`, plainTextOnly === true, addressClass))
          ? name
          : undefined
      )
    )
    return [...new Set(found.filter((name): name is string => name !== undefined))]
  }

  /**
   * `true` when `url` answers 200 with a non-HTML content type (`text/plain`
   * when `plainTextOnly`). Redirects are not followed and any error counts as
   * absent.
   */
  private async servesTextFile(
    url: string,
    plainTextOnly: boolean,
    addressClass: AddressClass | undefined
  ): Promise<boolean> {
    try {
      const resp = await this.axiosInstance.get<string>(url, {
        responseType: 'text',
        timeout: Math.min(PROBE_TIMEOUT_MS, this.opts.timeout),
        maxContentLength: PROBE_MAX_BYTES,
        ...this.connectOptions(addressClass),
      })
      if (resp.status !== 200) return false
      const header = (resp.headers as Record<string, unknown>)['content-type']
      const type = String(header ?? '')
        .split(';')[0]
        .trim()
        .toLowerCase()
      return plainTextOnly ? type === 'text/plain' : type !== '' && !HTML_TYPES.has(type)
    } catch {
      return false
    }
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private async fetchWithRetry(
    url: string,
    startClass: AddressClass | undefined,
    attempt = 0
  ): Promise<FetchResult> {
    try {
      return await this.fetchFollowingRedirects(url, startClass)
    } catch (err) {
      if (attempt < this.opts.maxRetries && !this.signal?.aborted && this.isRetryable(err)) {
        await this.sleep(this.opts.retryDelay * (attempt + 1))
        if (this.signal?.aborted) throw new FetchError(`Request aborted: ${url}`, url, err)
        return this.fetchWithRetry(url, startClass, attempt + 1)
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
  private async fetchFollowingRedirects(
    startUrl: string,
    startClass: AddressClass | undefined
  ): Promise<FetchResult> {
    const redirectChain: RedirectEntry[] = []
    let currentUrl = startUrl
    let currentClass = startClass

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      // axios counts download progress before it decompresses the body, so the
      // final `loaded` is the number of bytes received whatever the framing.
      // Its last event is delivered before the request promise settles.
      let bytesReceived = 0
      const request: AxiosRequestConfig = {
        // Bytes, not text, so the decompressed size can be measured before decoding.
        responseType: 'arraybuffer',
        onDownloadProgress: (event) => {
          bytesReceived = event.loaded
        },
        ...this.connectOptions(currentClass),
        ...requestHeaders(
          this.extraHeaders,
          startUrl,
          currentUrl,
          redirectChain.map((entry) => entry.url)
        ),
      }
      // The start URL and every redirect hop pass the SSRF guard (hostPolicy,
      // isDisallowedHost, DNS check) before this request is made.
      const resp = await this.axiosInstance.get<unknown>(currentUrl, request) // NOSONAR

      if (resp.status >= 300 && resp.status < 400) {
        if (!this.opts.followRedirects) {
          // Caller asked not to follow – return the redirect response as-is.
          return HttpClient.buildResult(startUrl, currentUrl, resp, redirectChain, bytesReceived)
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
        const nextUrl = new URL(location, currentUrl).href

        // SSRF guard: validate the redirect target before following it.
        currentClass = await this.checkRedirectTarget(nextUrl, currentUrl, startUrl, currentClass)
        currentUrl = nextUrl
        continue
      }

      return HttpClient.buildResult(startUrl, currentUrl, resp, redirectChain, bytesReceived)
    }

    throw new FetchError(`Too many redirects (> ${MAX_REDIRECTS}) for ${startUrl}`, startUrl)
  }

  /**
   * Refuses a redirect target that the host policy (or, without one, the
   * default SSRF rules) does not allow. Returns the target's address class
   * when a policy is in use.
   */
  private async checkRedirectTarget(
    nextUrl: string,
    fromUrl: string,
    startUrl: string,
    fromClass: AddressClass | undefined
  ): Promise<AddressClass | undefined> {
    if (this.hostPolicy) {
      const decision = await evaluateUrl(nextUrl, this.hostPolicy, fromClass)
      if (!decision.allowed) {
        throw new FetchError(
          `Redirect target not allowed (${decision.reason}): ${nextUrl}`,
          startUrl
        )
      }
      return decision.addressClass
    }

    const nextHostname = new URL(nextUrl).hostname
    if (isDisallowedHost(nextHostname)) {
      // A local name here can only be the caller's own start host: the API refuses
      // one at validation, and a hop that introduces one is refused just below.
      if (nextHostname === new URL(fromUrl).hostname) return undefined
      throw new FetchError(
        `Redirect target host is not allowed for security reasons: ${nextHostname}`,
        startUrl
      )
    }
    // Same-host hops are not exempt: the name may resolve somewhere else by now.
    if (await dnsResolvesToPrivateAddress(nextHostname)) {
      throw new FetchError(
        `Redirect target resolves to a private or unreachable address: ${nextHostname}`,
        startUrl
      )
    }
    return undefined
  }

  private static buildResult(
    originalUrl: string,
    finalUrl: string,
    resp: AxiosResponse<unknown>,
    redirectChain: RedirectEntry[],
    contentLength: number
  ): FetchResult {
    const headers = responseHeaders(resp)

    // Decode as axios does for text responses: UTF-8, then drop a leading BOM.
    const bytes = toBuffer(resp.data)
    const text = bytes.toString('utf8')
    const body = text.codePointAt(0) === 0xfeff ? text.slice(1) : text

    return {
      url: finalUrl,
      originalUrl,
      statusCode: resp.status,
      headers,
      body,
      redirectChain,
      fromCache: false,
      contentLength,
      bodyByteLength: bytes.length,
      contentEncoding: headers['content-encoding'],
      contentType: headers['content-type'],
    }
  }

  private isRetryable(err: unknown): boolean {
    // FetchError represents a definitive failure (SSRF guard, robots.txt, too many
    // redirects, etc.) that will not be resolved by retrying.
    if (err instanceof FetchError) return false
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
