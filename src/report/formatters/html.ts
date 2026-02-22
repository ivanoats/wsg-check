/**
 * Report Formatter — HTML
 *
 * Renders a `SustainabilityReport` as a self-contained, styled HTML5
 * document.  All CSS is inlined so the file can be opened directly in a
 * browser without any external dependencies.
 */

import type { SustainabilityReport, Recommendation } from '../types.js'
import type { CheckResult, CategoryScore } from '../../core/types.js'
import { scoreBadgeSvg, categoryBarChartSvg } from '../visualization.js'
import { esc } from './escape.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns an HTML-escaped URL only when the protocol is `http:` or `https:`.
 * All other values (including `javascript:` and data URIs) are replaced with
 * `'#'` to prevent protocol-based XSS in href attributes.
 */
const safeHref = (url: string): string => {
  try {
    const { protocol } = new URL(url)
    if (protocol === 'http:' || protocol === 'https:') return esc(url)
  } catch {
    // invalid URL — fall through to safe default
  }
  return '#'
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1_024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(2)} MB`
}

const formatDuration = (ms: number): string =>
  ms < 1_000 ? `${ms}ms` : `${(ms / 1_000).toFixed(1)}s`

const GRADE_COLOR: Readonly<Record<string, string>> = {
  A: '#22c55e',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
}

const STATUS_ICON: Readonly<Record<string, string>> = {
  pass: '✅',
  fail: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  'not-applicable': '➖',
}

const STATUS_CLASS: Readonly<Record<string, string>> = {
  pass: 'status-pass',
  fail: 'status-fail',
  warn: 'status-warn',
  info: 'status-info',
  'not-applicable': 'status-na',
}

// ─── Section builders ─────────────────────────────────────────────────────────

const buildCategoryRows = (categories: ReadonlyArray<CategoryScore>): string =>
  categories
    .map(
      (c) => `
      <tr>
        <td>${esc(c.category)}</td>
        <td class="num">${c.score}</td>
        <td class="num">${c.passed}</td>
        <td class="num">${c.failed}</td>
        <td class="num">${c.warned}</td>
        <td class="num">${c.notApplicable}</td>
      </tr>`
    )
    .join('')

const buildCheckRows = (checks: ReadonlyArray<CheckResult>): string =>
  checks
    .map(
      (c) => `
      <tr>
        <td><code>${esc(c.guidelineId)}</code></td>
        <td>${esc(c.guidelineName)}</td>
        <td class="${STATUS_CLASS[c.status] ?? ''}">${STATUS_ICON[c.status] ?? esc(c.status)} ${esc(c.status)}</td>
        <td class="num">${c.score}</td>
        <td>${esc(c.impact)}</td>
      </tr>`
    )
    .join('')

const buildRecommendationItems = (recommendations: ReadonlyArray<Recommendation>): string => {
  if (recommendations.length === 0)
    return '<p class="no-recs">No recommendations — great work! 🏆</p>'
  return recommendations
    .map(
      (rec) => `
    <li class="rec rec-${rec.impact}">
      <div class="rec-header">
        <span class="rec-id">${esc(rec.guidelineId)}</span>
        <span class="rec-name">${esc(rec.guidelineName)}</span>
        <span class="badge badge-${rec.impact}">${esc(rec.impact)}</span>
        <span class="badge badge-${rec.status}">${esc(rec.status)}</span>
      </div>
      <p class="rec-text">${esc(rec.recommendation)}</p>
      ${
        rec.resources && rec.resources.length > 0
          ? `<ul class="rec-links">${rec.resources.map((r) => `<li><a href="${safeHref(r)}" rel="noopener noreferrer">${esc(r)}</a></li>`).join('')}</ul>`
          : ''
      }
    </li>`
    )
    .join('')
}

const buildMetricRows = (report: SustainabilityReport): string => {
  const rows: string[] = [
    `<tr><td>Page Weight</td><td>${esc(formatBytes(report.metadata.pageWeight))}</td></tr>`,
    `<tr><td>Resource Count</td><td class="num">${report.metadata.requestCount}</td></tr>`,
    `<tr><td>Third-party Resources</td><td class="num">${report.metadata.thirdPartyCount}</td></tr>`,
  ]
  if (report.metadata.co2PerPageView !== undefined)
    rows.push(
      `<tr><td>CO₂ per Page View</td><td>${report.metadata.co2PerPageView.toFixed(4)}g</td></tr>`
    )
  if (report.metadata.co2Model !== undefined)
    rows.push(`<tr><td>CO₂ Model</td><td>${esc(report.metadata.co2Model)}</td></tr>`)
  if (report.metadata.isGreenHosted !== undefined)
    rows.push(
      `<tr><td>Green Hosting</td><td>${report.metadata.isGreenHosted ? '✅ Yes' : '❌ No'}</td></tr>`
    )
  return rows.join('\n')
}

// ─── Inline CSS ───────────────────────────────────────────────────────────────

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --font: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --bg: #f8fafc; --surface: #ffffff; --border: #e2e8f0;
    --text: #1e293b; --muted: #64748b; --code-bg: #f1f5f9;
    --pass: #16a34a; --fail: #dc2626; --warn: #d97706;
    --info: #2563eb; --na: #6b7280;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f172a; --surface: #1e293b; --border: #334155;
      --text: #f1f5f9; --muted: #94a3b8; --code-bg: #0f172a;
    }
  }
  body { font-family: var(--font); background: var(--bg); color: var(--text); line-height: 1.6; padding: 1rem; }
  .container { max-width: 960px; margin: 0 auto; }
  h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.25rem; margin: 2rem 0 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem; }
  a { color: #3b82f6; }
  .meta { color: var(--muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
  .meta span { display: inline-block; margin-right: 1.5rem; }
  .score-banner { background: var(--surface); border: 1px solid var(--border); border-radius: 0.75rem;
    padding: 1.25rem 1.5rem; display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1rem; }
  .grade { font-size: 3rem; font-weight: 800; line-height: 1; }
  .score-details { flex: 1; }
  .score-number { font-size: 1.5rem; font-weight: 700; }
  .score-label { color: var(--muted); font-size: 0.85rem; }
  table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border);
    border-radius: 0.5rem; overflow: hidden; font-size: 0.9rem; margin-bottom: 1rem; }
  th { background: var(--code-bg); font-weight: 600; text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }
  td { padding: 0.45rem 0.75rem; border-bottom: 1px solid var(--border); vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: var(--code-bg); }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  code { background: var(--code-bg); padding: 0.1em 0.3em; border-radius: 0.2em; font-size: 0.85em; }
  .status-pass { color: var(--pass); }
  .status-fail { color: var(--fail); font-weight: 600; }
  .status-warn { color: var(--warn); }
  .status-info { color: var(--info); }
  .status-na { color: var(--na); }
  .recs { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
  .rec { background: var(--surface); border: 1px solid var(--border); border-radius: 0.5rem; padding: 0.75rem 1rem; }
  .rec-high { border-left: 4px solid var(--fail); }
  .rec-medium { border-left: 4px solid var(--warn); }
  .rec-low { border-left: 4px solid var(--info); }
  .rec-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.3rem; }
  .rec-id { font-weight: 700; font-size: 0.85rem; }
  .rec-name { flex: 1; font-weight: 600; }
  .badge { font-size: 0.7rem; padding: 0.15em 0.5em; border-radius: 9999px; text-transform: uppercase; font-weight: 700; }
  .badge-high { background: #fee2e2; color: #991b1b; }
  .badge-medium { background: #fef3c7; color: #92400e; }
  .badge-low { background: #dbeafe; color: #1e40af; }
  .badge-fail { background: #fee2e2; color: #991b1b; }
  .badge-warn { background: #fef3c7; color: #92400e; }
  .rec-text { font-size: 0.9rem; margin: 0.25rem 0; }
  .rec-links { font-size: 0.8rem; margin-top: 0.25rem; padding-left: 1rem; color: var(--muted); }
  .no-recs { color: var(--pass); font-weight: 600; padding: 0.75rem 0; }
  .disclaimer { background: var(--code-bg); border-left: 4px solid var(--border);
    padding: 0.75rem 1rem; font-size: 0.85rem; color: var(--muted); border-radius: 0 0.25rem 0.25rem 0; }
  @media (max-width: 640px) {
    .score-banner { flex-direction: column; align-items: flex-start; }
    table { font-size: 0.8rem; }
  }
  @media print {
    body { background: white; }
    .container { max-width: 100%; }
  }
`

// ─── Main formatter ───────────────────────────────────────────────────────────

/**
 * Renders a `SustainabilityReport` as a self-contained HTML5 document.
 *
 * The output includes inline CSS so it can be opened directly in a browser
 * without any external assets.
 *
 * @param report - The report to render.
 * @returns A string containing the full HTML document.
 */
export const formatHtml = (report: SustainabilityReport): string => {
  const gradeColor = GRADE_COLOR[report.grade] ?? '#6b7280'
  const date = new Date(report.timestamp).toUTCString()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WSG Sustainability Report — ${esc(report.url)}</title>
  <style>${CSS}</style>
</head>
<body>
<div class="container">
  <h1>WSG Sustainability Report</h1>
  <div class="meta">
    <span><strong>URL:</strong> <a href="${safeHref(report.url)}" rel="noopener noreferrer">${esc(report.url)}</a></span>
    <span><strong>Date:</strong> ${esc(date)}</span>
    <span><strong>Duration:</strong> ${esc(formatDuration(report.duration))}</span>
  </div>

  <div class="score-banner">
    <div class="grade" style="color:${gradeColor}">${esc(report.grade)}</div>
    <div class="score-details">
      <div class="score-number">${report.overallScore} <span class="score-label">/ 100</span></div>
      <div class="score-label">Overall sustainability score</div>
      <div class="badge-wrap" style="margin-top:0.4rem">${scoreBadgeSvg(report.grade, report.overallScore)}</div>
    </div>
    <table style="width:auto;border:none;background:transparent;margin:0">
      <tr><td style="border:none;padding:0.2rem 0.5rem">✅ Passed</td><td class="num" style="border:none;padding:0.2rem 0.5rem">${report.summary.passed}</td></tr>
      <tr><td style="border:none;padding:0.2rem 0.5rem">❌ Failed</td><td class="num" style="border:none;padding:0.2rem 0.5rem">${report.summary.failed}</td></tr>
      <tr><td style="border:none;padding:0.2rem 0.5rem">⚠️ Warned</td><td class="num" style="border:none;padding:0.2rem 0.5rem">${report.summary.warnings}</td></tr>
      <tr><td style="border:none;padding:0.2rem 0.5rem">➖ N/A</td><td class="num" style="border:none;padding:0.2rem 0.5rem">${report.summary.notApplicable}</td></tr>
    </table>
  </div>

  <h2>Category Scores</h2>
  <div class="chart-wrap" style="margin-bottom:1rem;overflow-x:auto">${categoryBarChartSvg(report)}</div>
  <table>
    <thead><tr><th>Category</th><th>Score</th><th>Passed</th><th>Failed</th><th>Warned</th><th>N/A</th></tr></thead>
    <tbody>${buildCategoryRows(report.categories)}</tbody>
  </table>

  <h2>Recommendations</h2>
  <ul class="recs">${buildRecommendationItems(report.recommendations)}</ul>

  <h2>Check Results</h2>
  <table>
    <thead><tr><th>ID</th><th>Guideline</th><th>Status</th><th>Score</th><th>Impact</th></tr></thead>
    <tbody>${buildCheckRows(report.checks)}</tbody>
  </table>

  <h2>Page Metrics</h2>
  <table>
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>${buildMetricRows(report)}</tbody>
  </table>

  <h2>Methodology</h2>
  <p><strong>Analysis type:</strong> ${esc(report.methodology.analysisType)}</p>
  <div class="disclaimer">${esc(report.methodology.disclaimer)}</div>
  ${
    report.methodology.coreWebVitalsNote
      ? `<p style="margin-top:0.75rem;font-size:0.9rem"><strong>Core Web Vitals:</strong> ${esc(report.methodology.coreWebVitalsNote)}</p>`
      : ''
  }
  ${
    report.methodology.co2EstimationModel
      ? `<p style="margin-top:0.5rem;font-size:0.9rem"><strong>CO₂ Model:</strong> ${esc(report.methodology.co2EstimationModel)}</p>`
      : ''
  }
</div>
</body>
</html>`
}
