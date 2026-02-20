/**
 * Score calculator for wsg-check.
 *
 * Derives per-category and overall sustainability scores (0–100) from a set
 * of `CheckResult` objects using a weighted average strategy.
 *
 * Scoring rules
 * ─────────────
 *   'pass'           →  100 points
 *   'warn'           →   50 points
 *   'fail'           →    0 points
 *   'info'           →  excluded (informational only)
 *   'not-applicable' →  excluded (not relevant for this page)
 *
 * Impact weights
 * ──────────────
 *   'high'   →  3
 *   'medium' →  2
 *   'low'    →  1
 *
 * The final score for a set of results is:
 *   Σ(statusScore × impactWeight) / Σ(impactWeight)
 * rounded to the nearest integer.
 *
 * When no scoreable results exist, the score defaults to 100 (no evidence of
 * failure).
 */

import type { WSGCategory } from '../config/types.js'
import type { CategoryScore, CheckResult } from './types.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const IMPACT_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

/** Statuses that contribute to numeric scoring. */
const SCOREABLE_STATUSES = new Set<CheckResult['status']>(['pass', 'fail', 'warn'])

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a check status to its raw point value (0–100). */
function statusPoints(status: CheckResult['status']): number {
  switch (status) {
    case 'pass':
      return 100
    case 'warn':
      return 50
    case 'fail':
      return 0
    default:
      return 0
  }
}

/**
 * Compute the impact-weighted average score for an array of results.
 *
 * Returns `null` when there are no scoreable results (caller decides the
 * default).
 */
function weightedScore(results: CheckResult[]): number | null {
  const scoreable = results.filter((r) => SCOREABLE_STATUSES.has(r.status))
  if (scoreable.length === 0) return null

  let totalWeight = 0
  let weightedSum = 0

  for (const result of scoreable) {
    const weight = IMPACT_WEIGHT[result.impact] ?? 1
    weightedSum += statusPoints(result.status) * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null
}

// ─── Exported functions ───────────────────────────────────────────────────────

/**
 * Calculate the score and check counts for a single WSG category.
 *
 * When the category has no scoreable results, the score defaults to `100`.
 */
export function calculateCategoryScore(
  results: CheckResult[],
  category: WSGCategory
): CategoryScore {
  const categoryResults = results.filter((r) => r.category === category)
  const scoreable = categoryResults.filter((r) => SCOREABLE_STATUSES.has(r.status))

  return {
    category,
    score: weightedScore(categoryResults) ?? 100,
    totalChecks: categoryResults.length,
    passed: categoryResults.filter((r) => r.status === 'pass').length,
    failed: categoryResults.filter((r) => r.status === 'fail').length,
    warned: categoryResults.filter((r) => r.status === 'warn').length,
    notApplicable: categoryResults.filter((r) => r.status === 'not-applicable').length,
    scoredChecks: scoreable.length,
  }
}

/**
 * Calculate the overall sustainability score across all results.
 *
 * Returns `100` when there are no scoreable results.
 */
export function calculateOverallScore(results: CheckResult[]): number {
  return weightedScore(results) ?? 100
}

/**
 * Calculate both the overall score and per-category breakdown in one call.
 *
 * All four WSG categories (`ux`, `web-dev`, `hosting`, `business`) are always
 * included in the returned `categoryScores`, even when a category has no
 * checks.
 */
export function scoreResults(results: CheckResult[]): {
  overallScore: number
  categoryScores: CategoryScore[]
} {
  const categories: WSGCategory[] = ['ux', 'web-dev', 'hosting', 'business']

  return {
    overallScore: calculateOverallScore(results),
    categoryScores: categories.map((cat) => calculateCategoryScore(results, cat)),
  }
}
