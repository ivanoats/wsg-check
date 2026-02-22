/**
 * Report Module — Phase 6.4: Score Visualization
 *
 * Provides pure functions for rendering:
 *   1. An inline SVG score badge (A–F grade with color, suitable for HTML reports).
 *   2. Structured bar-chart data and an inline SVG bar chart for per-category scores.
 *   3. A trend-comparison utility that diffs two `SustainabilityReport` objects.
 *
 * All SVG output is self-contained and safe to embed directly in HTML (no external
 * assets, no JavaScript).  All strings are HTML-escaped before insertion.
 *
 * Design notes:
 *   - Functions are pure (no side effects, no module-level mutable state).
 *   - Types use `readonly` to enforce immutability.
 *   - SVG dimensions and colors are derived from the grade/score so the badge
 *     is accessible at a glance without relying solely on color.
 */

import type { Grade, SustainabilityReport } from './types.js'

// ─── Grade colours ────────────────────────────────────────────────────────────

/**
 * Maps each letter grade to a hex color used in SVG badges and bar charts.
 *
 * | Grade | Meaning                     | Color   |
 * | ----- | --------------------------- | ------- |
 * | A     | Excellent (≥ 90)            | #22c55e |
 * | B     | Good (75–89)                | #3b82f6 |
 * | C     | Fair (60–74)                | #f59e0b |
 * | D     | Poor (45–59)                | #f97316 |
 * | F     | Failing (< 45)              | #ef4444 |
 */
export const GRADE_COLORS: Readonly<Record<Grade, string>> = {
  A: '#22c55e',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
}

/**
 * Returns the hex colour associated with a letter grade.
 *
 * @param grade - A letter grade produced by `scoreToGrade`.
 * @returns A CSS hex colour string (e.g. `'#22c55e'`).
 */
export const getGradeColor = (grade: Grade): string => GRADE_COLORS[grade]

// ─── SVG escaping ─────────────────────────────────────────────────────────────

/** Escapes characters with special meaning in SVG/HTML attributes. */
const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ─── Score badge ──────────────────────────────────────────────────────────────

/**
 * Structured data for a score badge, useful for custom rendering outside SVG.
 */
export interface ScoreBadgeData {
  /** Letter grade (A–F). */
  readonly grade: Grade
  /** Overall score (0–100). */
  readonly score: number
  /** Hex colour for the grade. */
  readonly color: string
  /** Accessible text label combining grade and score. */
  readonly label: string
}

/**
 * Returns the structured data behind a score badge.
 *
 * @param grade - The letter grade.
 * @param score - The overall score (0–100).
 */
export const scoreBadgeData = (grade: Grade, score: number): ScoreBadgeData => ({
  grade,
  score,
  color: getGradeColor(grade),
  label: `Grade ${grade} — ${score}/100`,
})

/**
 * Renders an inline SVG score badge styled after the shields.io badge convention.
 *
 * The badge has two panels:
 *   - Left:  "sustainability" label on a dark background
 *   - Right: Grade letter and numeric score on a grade-coloured background
 *
 * The output is safe to embed directly in HTML (`<img>` or inline SVG).
 *
 * @param grade - The letter grade (A–F).
 * @param score - The overall score (0–100).
 * @returns A self-contained SVG string.
 */
export const scoreBadgeSvg = (grade: Grade, score: number): string => {
  const color = getGradeColor(grade)
  const label = 'sustainability'
  const value = `${grade} · ${score}/100`
  // Approximate character widths for the two text panels (6 px per char + padding)
  const labelW = label.length * 6 + 16
  const valueW = value.length * 6 + 16
  const totalW = labelW + valueW
  const height = 20
  const labelX = Math.round(labelW / 2)
  const valueX = labelW + Math.round(valueW / 2)

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${height}" role="img" aria-label="${esc(grade + ' ' + score + '/100')}">
  <title>${esc(`Sustainability grade ${grade} — ${score}/100`)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalW}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="${height}" fill="#555"/>
    <rect x="${labelW}" width="${valueW}" height="${height}" fill="${esc(color)}"/>
    <rect width="${totalW}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelX}" y="15" fill="#010101" fill-opacity=".3" aria-hidden="true">${esc(label)}</text>
    <text x="${labelX}" y="14">${esc(label)}</text>
    <text x="${valueX}" y="15" fill="#010101" fill-opacity=".3" aria-hidden="true">${esc(value)}</text>
    <text x="${valueX}" y="14" font-weight="bold">${esc(value)}</text>
  </g>
</svg>`
}

// ─── Category bar chart ───────────────────────────────────────────────────────

/**
 * Structured data for a single bar in the category bar chart.
 */
export interface CategoryChartBar {
  /** WSG category name. */
  readonly category: string
  /** Weighted score for this category (0–100). */
  readonly score: number
  /** Hex colour derived from the equivalent grade for this score. */
  readonly color: string
  /** Bar fill percentage (equal to `score` since the scale is 0–100). */
  readonly fillPercent: number
}

/**
 * Derives the grade-equivalent colour for a numeric score.
 * Re-uses the same thresholds as `scoreToGrade` so bar colours are consistent
 * with the score badge.
 */
const scoreColor = (score: number): string => {
  if (score >= 90) return GRADE_COLORS.A
  if (score >= 75) return GRADE_COLORS.B
  if (score >= 60) return GRADE_COLORS.C
  if (score >= 45) return GRADE_COLORS.D
  return GRADE_COLORS.F
}

/**
 * Returns an array of bar-chart data objects, one per WSG category.
 *
 * The data is format-agnostic: it can be consumed by the SVG bar-chart
 * renderer (`categoryBarChartSvg`) or by any custom chart implementation.
 *
 * @param report - The sustainability report to extract category data from.
 * @returns An array of `CategoryChartBar` objects sorted by score descending.
 */
export const categoryBarChartData = (
  report: SustainabilityReport
): ReadonlyArray<CategoryChartBar> =>
  [...report.categories]
    .sort((a, b) => b.score - a.score)
    .map((c) => ({
      category: c.category,
      score: c.score,
      color: scoreColor(c.score),
      fillPercent: c.score,
    }))

/**
 * Renders the per-category scores as an inline SVG horizontal bar chart.
 *
 * Each bar is annotated with the category name on the left and the numeric
 * score on the right.  Bars are coloured using the same grade thresholds as
 * the score badge.
 *
 * @param report - The sustainability report to visualise.
 * @returns A self-contained SVG string ready to embed in HTML.
 */
export const categoryBarChartSvg = (report: SustainabilityReport): string => {
  const bars = categoryBarChartData(report)
  if (bars.length === 0) return ''

  const barHeight = 22
  const labelWidth = 120
  const scoreWidth = 40
  const chartWidth = 300
  const rowGap = 6
  const rowHeight = barHeight + rowGap
  const totalHeight = bars.length * rowHeight - rowGap + 8
  const svgWidth = labelWidth + chartWidth + scoreWidth + 8

  const barRows = bars
    .map((bar, i) => {
      const y = 4 + i * rowHeight
      const barW = Math.round((bar.fillPercent / 100) * chartWidth)
      return `  <g transform="translate(0,${y})">
    <text x="${labelWidth - 6}" y="${barHeight / 2 + 4}" text-anchor="end" font-size="12" fill="currentColor" font-family="system-ui,sans-serif">${esc(bar.category)}</text>
    <rect x="${labelWidth}" y="0" width="${chartWidth}" height="${barHeight}" rx="3" fill="#e2e8f0"/>
    <rect x="${labelWidth}" y="0" width="${barW}" height="${barHeight}" rx="3" fill="${esc(bar.color)}"/>
    <text x="${labelWidth + chartWidth + 6}" y="${barHeight / 2 + 4}" font-size="12" font-weight="bold" fill="currentColor" font-family="system-ui,sans-serif">${esc(String(bar.score))}</text>
  </g>`
    })
    .join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${totalHeight}" role="img" aria-label="Category scores bar chart" viewBox="0 0 ${svgWidth} ${totalHeight}">
  <title>Category scores</title>
${barRows}
</svg>`
}

// ─── Trend comparison ─────────────────────────────────────────────────────────

/**
 * Score change for a single WSG category between two reports.
 */
export interface CategoryTrend {
  /** WSG category name. */
  readonly category: string
  /** Score in the previous report. */
  readonly previousScore: number
  /** Score in the current report. */
  readonly currentScore: number
  /** Absolute difference (`currentScore - previousScore`). */
  readonly delta: number
  /** Direction of change. */
  readonly direction: 'improved' | 'declined' | 'unchanged'
}

/**
 * The result of comparing two `SustainabilityReport` objects.
 *
 * All numeric deltas use the convention `current − previous`, so positive
 * values represent improvements.
 */
export interface TrendComparison {
  /** URL that was analysed (taken from the current report). */
  readonly url: string
  /** Timestamp of the earlier (baseline) report. */
  readonly previousTimestamp: string
  /** Timestamp of the later (current) report. */
  readonly currentTimestamp: string
  /** Overall score in the previous report. */
  readonly previousScore: number
  /** Overall score in the current report. */
  readonly currentScore: number
  /** Change in overall score (`currentScore − previousScore`). */
  readonly scoreDelta: number
  /** Previous letter grade. */
  readonly previousGrade: Grade
  /** Current letter grade. */
  readonly currentGrade: Grade
  /**
   * `true` when the grade improved (e.g., C → B),
   * `false` when it declined (B → C),
   * `null` when the grade is unchanged.
   */
  readonly gradeImproved: boolean | null
  /** Per-category breakdown of score changes. */
  readonly categories: ReadonlyArray<CategoryTrend>
  /**
   * Summary counts of categories that improved, declined, or stayed the same.
   */
  readonly summary: {
    readonly improved: number
    readonly declined: number
    readonly unchanged: number
  }
}

/** Numeric rank for grade ordering (lower = better). */
const GRADE_RANK: Readonly<Record<Grade, number>> = { A: 1, B: 2, C: 3, D: 4, F: 5 }

const gradeDirection = (prev: Grade, curr: Grade): boolean | null => {
  if (GRADE_RANK[curr] < GRADE_RANK[prev]) return true
  if (GRADE_RANK[curr] > GRADE_RANK[prev]) return false
  return null
}

const categoryDirection = (delta: number): CategoryTrend['direction'] => {
  if (delta > 0) return 'improved'
  if (delta < 0) return 'declined'
  return 'unchanged'
}

/**
 * Compares two `SustainabilityReport` objects and returns a `TrendComparison`
 * showing how scores evolved between runs.
 *
 * Categories present only in one report are included with a score of `0` for
 * the report in which they are absent.
 *
 * @param previous - The earlier (baseline) report.
 * @param current  - The later (comparison) report.
 * @returns A `TrendComparison` object summarising the changes.
 */
export const compareTrend = (
  previous: SustainabilityReport,
  current: SustainabilityReport
): TrendComparison => {
  const prevMap = new Map(previous.categories.map((c) => [c.category, c.score]))
  const currMap = new Map(current.categories.map((c) => [c.category, c.score]))
  const allCategories = new Set([...prevMap.keys(), ...currMap.keys()])

  const categories: ReadonlyArray<CategoryTrend> = [...allCategories].map((category) => {
    const previousScore = prevMap.get(category) ?? 0
    const currentScore = currMap.get(category) ?? 0
    const delta = currentScore - previousScore
    return { category, previousScore, currentScore, delta, direction: categoryDirection(delta) }
  })

  const improved = categories.filter((c) => c.direction === 'improved').length
  const declined = categories.filter((c) => c.direction === 'declined').length
  const unchanged = categories.filter((c) => c.direction === 'unchanged').length

  return {
    url: current.url,
    previousTimestamp: previous.timestamp,
    currentTimestamp: current.timestamp,
    previousScore: previous.overallScore,
    currentScore: current.overallScore,
    scoreDelta: current.overallScore - previous.overallScore,
    previousGrade: previous.grade,
    currentGrade: current.grade,
    gradeImproved: gradeDirection(previous.grade, current.grade),
    categories,
    summary: { improved, declined, unchanged },
  }
}
