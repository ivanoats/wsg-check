/**
 * Report Formatter — Markdown
 *
 * Renders a `SustainabilityReport` as a GitHub-flavoured Markdown document
 * suitable for PR comments, README badges, and static-site generators.
 */

import type { SustainabilityReport, Recommendation } from '../types.js'
import type { CheckResult, CategoryScore } from '../../core/types.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRADE_EMOJI: Readonly<Record<string, string>> = {
  A: '🏆',
  B: '✅',
  C: '⚠️',
  D: '🔶',
  F: '❌',
}

const STATUS_EMOJI: Readonly<Record<string, string>> = {
  pass: '✅',
  fail: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  'not-applicable': '➖',
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1_024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(2)} MB`
}

const formatDuration = (ms: number): string =>
  ms < 1_000 ? `${ms}ms` : `${(ms / 1_000).toFixed(1)}s`

/** Escape pipe characters so they don't break Markdown table cells. */
const mdCell = (text: string): string => text.replace(/\|/g, '\\|')

// ─── Section builders ─────────────────────────────────────────────────────────

const buildCategoryTable = (categories: ReadonlyArray<CategoryScore>): string => {
  const rows = categories.map(
    (c) =>
      `| ${c.category} | ${c.score} | ${c.passed} | ${c.failed} | ${c.warned} | ${c.notApplicable} |`
  )
  return [
    '| Category | Score | Passed | Failed | Warned | N/A |',
    '|----------|------:|-------:|-------:|-------:|----:|',
    ...rows,
  ].join('\n')
}

const buildCheckTable = (checks: ReadonlyArray<CheckResult>): string => {
  const rows = checks.map(
    (c) =>
      `| ${c.guidelineId} | ${mdCell(c.guidelineName)} | ${STATUS_EMOJI[c.status] ?? c.status} ${c.status} | ${c.score} | ${c.impact} |`
  )
  return [
    '| ID | Guideline | Status | Score | Impact |',
    '|----|-----------|--------|------:|--------|',
    ...rows,
  ].join('\n')
}

const buildRecommendations = (recommendations: ReadonlyArray<Recommendation>): string => {
  if (recommendations.length === 0) return '_No recommendations — great work!_'
  return recommendations
    .map((rec, i) => {
      const heading = `${i + 1}. **[${rec.guidelineId} ${mdCell(rec.guidelineName)}]** _(${rec.impact} impact, ${rec.status})_`
      const body = `   ${rec.recommendation}`
      const links =
        rec.resources && rec.resources.length > 0
          ? rec.resources.map((r) => `   - ${r}`).join('\n')
          : ''
      return [heading, body, ...(links ? [links] : [])].join('\n')
    })
    .join('\n\n')
}

const buildMetrics = (report: SustainabilityReport): string => {
  const rows: string[] = [
    `| Page Weight | ${formatBytes(report.metadata.pageWeight)} |`,
    `| Resource Count | ${report.metadata.requestCount} |`,
    `| Third-party Resources | ${report.metadata.thirdPartyCount} |`,
  ]
  if (report.metadata.co2PerPageView !== undefined)
    rows.push(`| CO₂ per Page View | ${report.metadata.co2PerPageView.toFixed(4)}g |`)
  if (report.metadata.co2Model !== undefined)
    rows.push(`| CO₂ Model | ${report.metadata.co2Model} |`)
  if (report.metadata.isGreenHosted !== undefined)
    rows.push(`| Green Hosting | ${report.metadata.isGreenHosted ? '✅ Yes' : '❌ No'} |`)
  return ['| Metric | Value |', '|--------|-------|', ...rows].join('\n')
}

// ─── Main formatter ───────────────────────────────────────────────────────────

/**
 * Renders a `SustainabilityReport` as a Markdown document.
 *
 * @param report - The report to render.
 * @returns A string containing the full Markdown document.
 */
export const formatMarkdown = (report: SustainabilityReport): string => {
  const gradeEmoji = GRADE_EMOJI[report.grade] ?? ''
  const sections: string[] = [
    '# WSG Sustainability Report',
    '',
    `**URL:** ${report.url}  `,
    `**Date:** ${new Date(report.timestamp).toUTCString()}  `,
    `**Duration:** ${formatDuration(report.duration)}  `,
    '',
    `## Overall Score: ${report.overallScore} / 100 — Grade ${gradeEmoji} ${report.grade}`,
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| Checks Passed | ${report.summary.passed} |`,
    `| Checks Failed | ${report.summary.failed} |`,
    `| Warnings | ${report.summary.warnings} |`,
    `| Not Applicable | ${report.summary.notApplicable} |`,
    `| **Total Checks** | **${report.summary.totalChecks}** |`,
    '',
    '## Category Scores',
    '',
    buildCategoryTable(report.categories),
    '',
    '## Recommendations',
    '',
    buildRecommendations(report.recommendations),
    '',
    '## Check Results',
    '',
    buildCheckTable(report.checks),
    '',
    '## Page Metrics',
    '',
    buildMetrics(report),
    '',
    '## Methodology',
    '',
    `**Analysis type:** ${report.methodology.analysisType}`,
    '',
    `> ${report.methodology.disclaimer}`,
    '',
  ]

  if (report.methodology.coreWebVitalsNote) {
    sections.push(`**Core Web Vitals:** ${report.methodology.coreWebVitalsNote}`, '')
  }
  if (report.methodology.co2EstimationModel) {
    sections.push(`**CO₂ Model:** ${report.methodology.co2EstimationModel}`, '')
  }

  return sections.join('\n')
}
