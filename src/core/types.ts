/**
 * Core types for wsg-check Phase 3.
 *
 * These types form the shared contract between the Core, Checks, and Report
 * modules.  They are intentionally framework-agnostic: no Next.js, no Axios,
 * no Cheerio — only plain TypeScript interfaces.
 */

import type { WSGCategory } from '../config/types.js'
import type { FetchResult } from '../utils/http-client.js'
import type { ParsedPage } from '../utils/html-parser.js'
import type { PageWeightAnalysis } from '../utils/resource-analyzer.js'
import type { CO2Model } from '../utils/carbon-estimator.js'

// ─── Check result ─────────────────────────────────────────────────────────────

/**
 * The result of a single WSG guideline check.
 *
 * Produced by every check function and consumed by the scorer and report
 * formatter.
 */
export interface CheckResult {
  /** WSG guideline identifier, e.g. `"3.2"`. */
  guidelineId: string
  /** Human-readable guideline name. */
  guidelineName: string
  /** Short label for the specific success criterion being tested. */
  successCriterion: string
  /** Outcome of the check. */
  status: 'pass' | 'fail' | 'warn' | 'info' | 'not-applicable'
  /**
   * Numeric score for this check (0–100).
   * Typically 100 for pass, 50 for warn, 0 for fail.
   * `info` and `not-applicable` results are excluded from aggregate scoring.
   */
  score: number
  /** Human-readable explanation of the result. */
  message: string
  /** Additional technical detail about the finding. */
  details?: string
  /** Actionable suggestion for improvement. */
  recommendation?: string
  /** Links to WSG guideline resources and success criteria. */
  resources?: string[]
  /** Relative severity — used as a weighting factor for the overall score. */
  impact: 'high' | 'medium' | 'low'
  category: WSGCategory
  /** `true` when the check can be fully determined by automated tooling. */
  machineTestable: boolean
}

// ─── Check function ───────────────────────────────────────────────────────────

/**
 * A check function takes the fully populated page data and returns either a
 * synchronous or asynchronous `CheckResult`.
 *
 * Check functions should never throw; errors are caught by the `CheckRunner`
 * and recorded as failed results so that the rest of the run continues.
 */
export type CheckFn = (page: PageData) => CheckResult | Promise<CheckResult>

// ─── Page data ────────────────────────────────────────────────────────────────

/**
 * All data collected for a single page during the fetch / parse phase.
 * This is the primary input to every check function.
 */
export interface PageData {
  /** The originally requested URL. */
  url: string
  /** Raw HTTP response from the fetcher. */
  fetchResult: FetchResult
  /** Parsed DOM representation from the HTML parser. */
  parsedPage: ParsedPage
  /** Aggregated page-weight and resource metrics. */
  pageWeight: PageWeightAnalysis
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Weighted score summary for a single WSG category.
 */
export interface CategoryScore {
  category: WSGCategory
  /** Weighted average score, 0–100. */
  score: number
  /** Total number of checks in this category. */
  totalChecks: number
  /** Checks with status `'pass'`. */
  passed: number
  /** Checks with status `'fail'`. */
  failed: number
  /** Checks with status `'warn'`. */
  warned: number
  /** Checks with status `'not-applicable'`. */
  notApplicable: number
  /** Checks that contributed to the score (pass / fail / warn only). */
  scoredChecks: number
}

// ─── Run result ───────────────────────────────────────────────────────────────

/**
 * The full outcome of a WSG check run against a single URL.
 * Consumed by the Report and CLI modules.
 */
export interface RunResult {
  /** The URL that was analysed. */
  url: string
  /** ISO 8601 timestamp of when the run started. */
  timestamp: string
  /** Total analysis duration in milliseconds. */
  duration: number
  /** Overall weighted sustainability score, 0–100. */
  overallScore: number
  /** Per-category score breakdown. */
  categoryScores: CategoryScore[]
  /** Individual results for every check that was run. */
  results: CheckResult[]
  /** Estimated CO2 emissions per page view in grams (Sustainable Web Design v4). */
  co2PerPageView: number
  /** The CO2 estimation model used. */
  co2Model: CO2Model
  /** Whether the hosting provider is recognised as running on renewable energy. */
  isGreenHosted: boolean
}
