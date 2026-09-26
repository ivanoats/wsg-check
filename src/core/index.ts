/**
 * Core module public API for wsg-check.
 *
 * `WsgChecker` is the main orchestrator.  It wires the pipeline together:
 *
 *   Config → PageFetcher → CheckRunner → ScoreCalculator → RunResult
 *
 * Usage:
 * ```ts
 * import { WsgChecker } from '@/core'
 *
 * const checker = new WsgChecker({ timeout: 15_000 }, [myCheck])
 * const result  = await checker.check('https://example.com')
 * if (result.ok) {
 *   console.log('Score:', result.value.overallScore)
 * }
 * ```
 */

import type { ResolvedConfig } from '../config/loader'
import { FetchError, ParseError, type Result, err, ok } from '../utils/errors'
import { raceAbort } from '../utils/abort'
import { defaultLogger, type Logger } from '../utils/logger'
import type { HostPolicy } from '../utils/host-policy'
import { estimateCO2, checkGreenHosting, CO2_MODEL } from '../utils/carbon-estimator'
import { PageFetcher } from './fetcher'
import { CheckRunner } from './runner'
import { scoreResults } from './scorer'
import type { CheckFn, RunResult } from './types'

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type { CheckResult, CheckFn, PageData, PageMetrics, CategoryScore, RunResult } from './types'
export { PageFetcher } from './fetcher'
export { CheckRunner } from './runner'
export { calculateCategoryScore, calculateOverallScore, scoreResults } from './scorer'

// ─── WsgChecker ───────────────────────────────────────────────────────────────

/** The stages of a check, reported through `CheckerConfig.onProgress`. */
export type CheckStage = 'fetching' | 'checking' | 'scoring'

/** Settings for `WsgChecker`: fetcher options, host policy, cancellation, progress. */
export type CheckerConfig = Partial<ResolvedConfig> & {
  /** Network access policy for the page fetch; see `HttpClientOptions`. */
  readonly hostPolicy?: HostPolicy
  /** Cancels the run when aborted: the page fetch, its retries, and the hosting lookup. */
  readonly signal?: AbortSignal
  /** Called as the check moves through its stages, e.g. to report progress. */
  readonly onProgress?: (stage: CheckStage) => void
}

/**
 * Top-level orchestrator that coordinates fetching, parsing, running checks,
 * and scoring for a single URL.
 *
 * Accepts an optional subset of `ResolvedConfig` (plus an optional host
 * policy) to configure the underlying `HttpClient`, and an optional array of
 * check functions to register on construction.  Additional checks can be
 * registered later via `checker.runner.register(fn)`.
 */
export class WsgChecker {
  readonly fetcher: PageFetcher
  readonly runner: CheckRunner
  private readonly logger: Logger
  private readonly onProgress?: (stage: CheckStage) => void
  private readonly signal?: AbortSignal

  constructor(
    config: CheckerConfig = {},
    checks: ReadonlyArray<CheckFn> = [],
    logger: Logger = defaultLogger
  ) {
    this.fetcher = new PageFetcher({
      timeout: config.timeout,
      userAgent: config.userAgent,
      followRedirects: config.followRedirects,
      hostPolicy: config.hostPolicy,
      signal: config.signal,
    })
    this.runner = new CheckRunner()
    this.runner.registerAll(checks)
    this.logger = logger
    this.onProgress = config.onProgress
    this.signal = config.signal
  }

  /**
   * Run all registered checks against the given URL.
   *
   * @returns `{ ok: true, value: RunResult }` on success, or
   *          `{ ok: false, error: FetchError | ParseError }` when the page
   *          cannot be fetched or parsed.
   */
  async check(url: string): Promise<Result<RunResult, FetchError | ParseError>> {
    this.logger.info('Starting WSG check', { url })
    const start = Date.now()

    this.onProgress?.('fetching')
    const pageResult = await this.fetcher.fetch(url)
    if (!pageResult.ok) {
      this.logger.error('Failed to fetch page', { url, error: pageResult.error.message })
      return pageResult
    }

    this.logger.debug('Page fetched successfully', {
      url,
      statusCode: pageResult.value.fetchResult.statusCode,
    })

    this.onProgress?.('checking')
    // Checks such as sustainable-hosting make their own network calls.
    const checkResults = await raceAbort(this.runner.run(pageResult.value), this.signal)
    if (checkResults === undefined) return err(new FetchError(`Request aborted: ${url}`, url))
    this.onProgress?.('scoring')
    const { overallScore, categoryScores } = scoreResults(checkResults)

    const domain = new URL(url).hostname
    const isGreenHosted = await checkGreenHosting(domain, this.signal)
    if (this.signal?.aborted) return err(new FetchError(`Request aborted: ${url}`, url))
    const co2PerPageView = estimateCO2(pageResult.value.pageWeight.htmlSize, isGreenHosted)

    const duration = Date.now() - start

    this.logger.info('WSG check complete', { url, overallScore, duration })

    return ok({
      url,
      finalUrl: pageResult.value.fetchResult.url,
      timestamp: new Date().toISOString(),
      duration,
      overallScore,
      categoryScores,
      results: checkResults,
      co2PerPageView,
      co2Model: CO2_MODEL,
      isGreenHosted,
      pageMetrics: {
        htmlSize: pageResult.value.pageWeight.htmlSize,
        resourceCount: pageResult.value.pageWeight.resourceCount,
        thirdPartyCount: pageResult.value.pageWeight.thirdPartyCount,
      },
    })
  }
}
