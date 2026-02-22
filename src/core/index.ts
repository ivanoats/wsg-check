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

import type { ResolvedConfig } from '../config/loader.js'
import { FetchError, ParseError, type Result, ok } from '../utils/errors.js'
import { defaultLogger, type Logger } from '../utils/logger.js'
import { estimateCO2, checkGreenHosting, CO2_MODEL } from '../utils/carbon-estimator.js'
import { PageFetcher } from './fetcher.js'
import { CheckRunner } from './runner.js'
import { scoreResults } from './scorer.js'
import type { CheckFn, RunResult } from './types.js'

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type { CheckResult, CheckFn, PageData, CategoryScore, RunResult } from './types.js'
export { PageFetcher } from './fetcher.js'
export { CheckRunner } from './runner.js'
export { calculateCategoryScore, calculateOverallScore, scoreResults } from './scorer.js'

// ─── WsgChecker ───────────────────────────────────────────────────────────────

/**
 * Top-level orchestrator that coordinates fetching, parsing, running checks,
 * and scoring for a single URL.
 *
 * Accepts an optional subset of `ResolvedConfig` to configure the underlying
 * `HttpClient`, and an optional array of check functions to register on
 * construction.  Additional checks can be registered later via
 * `checker.runner.register(fn)`.
 */
export class WsgChecker {
  readonly fetcher: PageFetcher
  readonly runner: CheckRunner
  private readonly logger: Logger

  constructor(
    config: Partial<ResolvedConfig> = {},
    checks: ReadonlyArray<CheckFn> = [],
    logger: Logger = defaultLogger
  ) {
    this.fetcher = new PageFetcher({
      timeout: config.timeout,
      userAgent: config.userAgent,
      followRedirects: config.followRedirects,
    })
    this.runner = new CheckRunner()
    this.runner.registerAll(checks)
    this.logger = logger
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

    const pageResult = await this.fetcher.fetch(url)
    if (!pageResult.ok) {
      this.logger.error('Failed to fetch page', { url, error: pageResult.error.message })
      return pageResult
    }

    this.logger.debug('Page fetched successfully', {
      url,
      statusCode: pageResult.value.fetchResult.statusCode,
    })

    const checkResults = await this.runner.run(pageResult.value)
    const { overallScore, categoryScores } = scoreResults(checkResults)

    const domain = new URL(url).hostname
    const isGreenHosted = await checkGreenHosting(domain)
    const co2PerPageView = estimateCO2(pageResult.value.pageWeight.htmlSize, isGreenHosted)

    const duration = Date.now() - start

    this.logger.info('WSG check complete', { url, overallScore, duration })

    return ok({
      url,
      timestamp: new Date().toISOString(),
      duration,
      overallScore,
      categoryScores,
      results: checkResults,
      co2PerPageView,
      co2Model: CO2_MODEL,
      isGreenHosted,
    })
  }
}
