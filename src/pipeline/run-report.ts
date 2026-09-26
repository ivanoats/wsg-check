/**
 * Runs checks against a URL and builds the report. Shared by the CLI, the
 * API, and the MCP server so that the pipeline and report construction
 * behave the same everywhere. Callers choose checks with `selectChecks`
 * first, so they can show its notices before the (slow) run starts.
 */

import { WsgChecker, type CheckerConfig } from '../core/index'
import type { CheckFn } from '../core/types'
import { fromRunResult, type SustainabilityReport } from '../report/types'
import { type FetchError, type ParseError, type Result, ok } from '../utils/errors'

export interface RunReportOptions {
  /** Checks to run, usually from `selectChecks`. */
  readonly checks: ReadonlyArray<CheckFn>
  /** HTTP settings and host policy passed to the fetcher. */
  readonly config?: CheckerConfig
}

/**
 * Runs `checks` against `url` and builds the report, including page-weight
 * metadata.
 *
 * @returns the report, or the fetch/parse error when the page cannot be
 *          analysed.
 */
export const runReport = async (
  url: string,
  { checks, config }: RunReportOptions
): Promise<Result<SustainabilityReport, FetchError | ParseError>> => {
  const result = await new WsgChecker(config, checks).check(url)
  return result.ok ? ok(fromRunResult(result.value)) : result
}
