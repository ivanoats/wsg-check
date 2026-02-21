/**
 * Report Module — Phase 6.1: Report Data Model
 *
 * Defines the `SustainabilityReport` interface and supporting types that
 * represent the full output of a WSG check run.  This is the authoritative
 * data contract consumed by all report formatters (JSON, Markdown, HTML,
 * terminal) introduced in subsequent phases.
 *
 * Design notes:
 *   - All types are `readonly` to enforce immutability after creation.
 *   - `SustainabilityReport` is a richer projection of `RunResult` that adds
 *     a letter grade, a human-readable summary, prioritised recommendations,
 *     report metadata, and methodology notes.
 *   - The `fromRunResult` factory converts a `RunResult` into a
 *     `SustainabilityReport`, deriving the grade, summary counts, and the
 *     stub recommendations list.  The full recommendations engine is
 *     implemented in Phase 6.3.
 *   - `STATIC_ANALYSIS_DISCLAIMER` is exported as a constant so that every
 *     formatter can include it without duplicating the text.
 */

import type { CheckResult, CategoryScore, RunResult } from '../core/types.js'
import type { CO2Model } from '../utils/carbon-estimator.js'

// ─── Grade ────────────────────────────────────────────────────────────────────

/** Letter grade derived from the overall sustainability score (0–100). */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

/**
 * Maps an overall score (0–100) to a letter grade.
 *
 * | Score   | Grade |
 * | ------- | ----- |
 * | 90–100  | A     |
 * | 75–89   | B     |
 * | 60–74   | C     |
 * | 45–59   | D     |
 * | 0–44    | F     |
 */
export const scoreToGrade = (score: number): Grade => {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 45) return 'D'
  return 'F'
}

// ─── Recommendation ───────────────────────────────────────────────────────────

/**
 * A single actionable improvement recommendation derived from a failed or
 * warned check result.  Recommendations are prioritised by impact so that
 * the most consequential improvements appear first.
 */
export interface Recommendation {
  /** The WSG guideline ID this recommendation targets, e.g. `"3.1"`. */
  readonly guidelineId: string
  /** Human-readable guideline name. */
  readonly guidelineName: string
  /**
   * Outcome of the underlying check.
   * Only `'fail'` and `'warn'` checks produce recommendations.
   */
  readonly status: 'fail' | 'warn'
  /**
   * Relative severity of the issue — used to order recommendations.
   * `high` issues appear before `medium`, which appear before `low`.
   */
  readonly impact: 'high' | 'medium' | 'low'
  /** Concise, actionable improvement suggestion. */
  readonly recommendation: string
  /** Optional links to WSG guideline resources and success criteria. */
  readonly resources?: ReadonlyArray<string>
}

// ─── Report Metadata ──────────────────────────────────────────────────────────

/**
 * Technical page metrics captured alongside the check results.
 * These values are used by report formatters to provide context.
 */
export interface ReportMetadata {
  /** Total size of the HTML document in bytes. */
  readonly pageWeight: number
  /** Total number of resource references found on the page. */
  readonly requestCount: number
  /** Number of resources loaded from third-party origins. */
  readonly thirdPartyCount: number
  /**
   * Estimated load time in milliseconds.
   * Only available when the fetcher records timing information.
   */
  readonly loadTime?: number
  /**
   * Estimated CO₂ emissions per page view in grams
   * using the Sustainable Web Design v4 model.
   */
  readonly co2PerPageView?: number
  /** CO₂ estimation model used. */
  readonly co2Model?: CO2Model
  /** Whether the hosting provider uses verified renewable energy. */
  readonly isGreenHosted?: boolean
}

// ─── Report Methodology ───────────────────────────────────────────────────────

/**
 * Notes on how the report was produced.
 * Included in every report so that readers understand the analysis scope
 * and its inherent limitations.
 */
export interface ReportMethodology {
  /**
   * `'static'` — HTML/HTTP response analysis only (current implementation).
   * `'browser'` — headless browser execution (future phase).
   */
  readonly analysisType: 'static' | 'browser'
  /**
   * Human-readable disclaimer explaining static-analysis constraints,
   * e.g. that external stylesheet content is not fetched and that Core
   * Web Vitals cannot be measured without a real browser.
   */
  readonly disclaimer: string
  /** Name and version of the CO₂ estimation model, e.g. `'swd-v4'`. */
  readonly co2EstimationModel?: string
  /**
   * Link (or note) pointing to a tool that provides live Core Web Vitals
   * data, e.g. Google PageSpeed Insights.
   */
  readonly coreWebVitalsNote?: string
}

// ─── Report Summary ───────────────────────────────────────────────────────────

/** Aggregate check-status counts for the summary section of the report. */
export interface ReportSummary {
  /** Total number of checks that were run. */
  readonly totalChecks: number
  /** Checks with status `'pass'`. */
  readonly passed: number
  /** Checks with status `'fail'`. */
  readonly failed: number
  /** Checks with status `'warn'`. */
  readonly warnings: number
  /** Checks with status `'not-applicable'` or `'info'`. */
  readonly notApplicable: number
}

// ─── Sustainability Report ────────────────────────────────────────────────────

/**
 * The full, enriched output of a WSG check run.
 *
 * This interface is the primary contract between the core pipeline and all
 * report formatters.  It extends `RunResult` with a letter grade, a human-
 * readable summary, prioritised recommendations, and methodology notes.
 */
export interface SustainabilityReport {
  /** The URL that was analysed. */
  readonly url: string
  /** ISO 8601 timestamp of when the run started. */
  readonly timestamp: string
  /** Total analysis duration in milliseconds. */
  readonly duration: number
  /** Overall weighted sustainability score, 0–100. */
  readonly overallScore: number
  /** Letter grade derived from `overallScore`. */
  readonly grade: Grade
  /** Per-category score breakdown. */
  readonly categories: ReadonlyArray<CategoryScore>
  /** Individual results for every check that was run. */
  readonly checks: ReadonlyArray<CheckResult>
  /** Aggregate pass/fail/warn/not-applicable counts. */
  readonly summary: ReportSummary
  /** Prioritised list of improvement recommendations. */
  readonly recommendations: ReadonlyArray<Recommendation>
  /** Page metrics and carbon-estimation data. */
  readonly metadata: ReportMetadata
  /** Notes on analysis methodology and limitations. */
  readonly methodology: ReportMethodology
}

// ─── Static analysis disclaimer ──────────────────────────────────────────────

/**
 * Standard disclaimer text included in all static-analysis reports.
 * Explains the limitations of HTML/HTTP-only analysis and points to
 * complementary tools for dimensions wsg-check cannot cover.
 */
export const STATIC_ANALYSIS_DISCLAIMER =
  'This report is based on static HTML and HTTP response analysis only. ' +
  'External stylesheet and script content is not fetched, so checks that ' +
  'require CSS or JavaScript execution (e.g. Core Web Vitals, animation ' +
  'guards in linked stylesheets) may produce false negatives. ' +
  'For live Core Web Vitals data, see Google PageSpeed Insights ' +
  '(https://pagespeed.web.dev/). For scenario-based energy monitoring, ' +
  'see GreenFrame (https://greenframe.io/) or Sitespeed.io (https://www.sitespeed.io/).'

// ─── Factory function ─────────────────────────────────────────────────────────

/**
 * Derives the `ReportSummary` counts from a list of `CheckResult` objects.
 */
const summariseResults = (results: ReadonlyArray<CheckResult>): ReportSummary => {
  let passed = 0
  let failed = 0
  let warnings = 0
  let notApplicable = 0

  for (const r of results) {
    if (r.status === 'pass') passed++
    else if (r.status === 'fail') failed++
    else if (r.status === 'warn') warnings++
    else notApplicable++ // 'info' and 'not-applicable'
  }

  return {
    totalChecks: results.length,
    passed,
    failed,
    warnings,
    notApplicable,
  }
}

/**
 * Derives the priority-ordered `Recommendation` list from check results.
 *
 * Only `'fail'` and `'warn'` results that carry a `recommendation` string
 * are included.  Results are ordered: `high` impact first, then `medium`,
 * then `low`.  Within the same impact tier, `fail` results precede `warn`.
 *
 * Note: the full recommendations engine (Phase 6.3) will enrich this list
 * with cross-check prioritisation, WSG resource links, and complementary
 * tool references.
 */
const deriveRecommendations = (
  results: ReadonlyArray<CheckResult>
): ReadonlyArray<Recommendation> => {
  const IMPACT_ORDER: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 1,
    low: 2,
  }
  const STATUS_ORDER: Record<'fail' | 'warn', number> = { fail: 0, warn: 1 }

  return results
    .filter(
      (r): r is CheckResult & { status: 'fail' | 'warn'; recommendation: string } =>
        (r.status === 'fail' || r.status === 'warn') && typeof r.recommendation === 'string'
    )
    .sort((a, b) => {
      const impactDiff = IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact]
      if (impactDiff !== 0) return impactDiff
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    })
    .map((r) => ({
      guidelineId: r.guidelineId,
      guidelineName: r.guidelineName,
      status: r.status,
      impact: r.impact,
      recommendation: r.recommendation,
      ...(r.resources && r.resources.length > 0 ? { resources: r.resources } : {}),
    }))
}

/**
 * Converts a `RunResult` into a `SustainabilityReport`.
 *
 * The factory:
 *   1. Derives the letter grade from `overallScore`.
 *   2. Computes `summary` counts from `results`.
 *   3. Builds the `recommendations` list from failed/warned checks.
 *   4. Extracts page-weight `metadata` from the first check's page context
 *      (co2/hosting data comes directly from `RunResult`).
 *   5. Attaches the standard static-analysis `methodology`.
 *
 * @param runResult - The raw output of `WsgChecker.check()`.
 * @param pageWeight - Optional page-weight metrics to include in metadata.
 * @param requestCount - Optional total resource count for metadata.
 * @param thirdPartyCount - Optional third-party resource count for metadata.
 */
export const fromRunResult = (
  runResult: RunResult,
  pageWeight = 0,
  requestCount = 0,
  thirdPartyCount = 0
): SustainabilityReport => ({
  url: runResult.url,
  timestamp: runResult.timestamp,
  duration: runResult.duration,
  overallScore: runResult.overallScore,
  grade: scoreToGrade(runResult.overallScore),
  categories: runResult.categoryScores,
  checks: runResult.results,
  summary: summariseResults(runResult.results),
  recommendations: deriveRecommendations(runResult.results),
  metadata: {
    pageWeight,
    requestCount,
    thirdPartyCount,
    co2PerPageView: runResult.co2PerPageView,
    co2Model: runResult.co2Model,
    isGreenHosted: runResult.isGreenHosted,
  },
  methodology: {
    analysisType: 'static',
    disclaimer: STATIC_ANALYSIS_DISCLAIMER,
    co2EstimationModel: runResult.co2Model,
    coreWebVitalsNote:
      'For live Core Web Vitals data, use Google PageSpeed Insights: ' +
      `https://pagespeed.web.dev/report?url=${encodeURIComponent(runResult.url)}`,
  },
})
