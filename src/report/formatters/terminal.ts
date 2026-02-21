/**
 * Report Formatter — Terminal
 *
 * Renders a `SustainabilityReport` as a colourised, human-readable string
 * suitable for printing to a terminal.  Uses raw ANSI escape codes so there
 * are no runtime colour-library dependencies.
 *
 * Colour output can be suppressed via `TerminalFormatOptions.colors = false`
 * (e.g. when `NO_COLOR` is set or when piping to a file).
 */

import type { SustainabilityReport, Recommendation } from '../types.js'
import type { CheckResult, CategoryScore } from '../../core/types.js'

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'
const BLUE = '\x1b[34m'
const MAGENTA = '\x1b[35m'

type Coloriser = (text: string) => string

const noColor: Coloriser = (t) => t

const makeColoriser =
  (enabled: boolean) =>
  (code: string): Coloriser =>
    enabled ? (t) => `${code}${t}${RESET}` : noColor

// ─── Options ──────────────────────────────────────────────────────────────────

/** Configuration for the terminal formatter. */
export interface TerminalFormatOptions {
  /**
   * When `true` (default), ANSI colour codes are included in the output.
   * Set to `false` when the output destination does not support ANSI
   * (e.g., when writing to a plain-text file or when `NO_COLOR` is set).
   */
  readonly colors?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatBytes = (bytes: number): string => {
  if (bytes < 1_024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(2)} MB`
}

const formatDuration = (ms: number): string =>
  ms < 1_000 ? `${ms}ms` : `${(ms / 1_000).toFixed(1)}s`

const pad = (str: string, width: number): string => str.padEnd(width)

const truncate = (str: string, max: number): string =>
  str.length > max ? str.slice(0, max - 1) + '…' : str

const HR = '─'.repeat(60)

// ─── Grade colour ─────────────────────────────────────────────────────────────

const gradeAnsi = (grade: string): string => {
  switch (grade) {
    case 'A':
      return GREEN
    case 'B':
      return CYAN
    case 'C':
      return YELLOW
    case 'D':
      return MAGENTA
    default:
      return RED
  }
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_ICON: Readonly<Record<string, string>> = {
  pass: '✓',
  fail: '✗',
  warn: '⚠',
  info: 'ℹ',
  'not-applicable': '—',
}

const statusColorCode = (status: string): string => {
  switch (status) {
    case 'pass':
      return GREEN
    case 'fail':
      return RED
    case 'warn':
      return YELLOW
    case 'info':
      return BLUE
    default:
      return DIM
  }
}

// ─── Section builders ─────────────────────────────────────────────────────────

const buildCategorySection = (
  categories: ReadonlyArray<CategoryScore>,
  col: ReturnType<typeof makeColoriser>
): string => {
  const bold = col(BOLD)
  const dim = col(DIM)
  const header = `${bold(pad('Category', 20))} ${pad('Score', 6)} ${pad('Pass', 6)} ${pad('Fail', 6)} ${pad('Warn', 6)} ${dim('N/A')}`
  const rows = categories.map(
    (c) =>
      `${pad(c.category, 20)} ${pad(String(c.score), 6)} ${pad(String(c.passed), 6)} ${pad(String(c.failed), 6)} ${pad(String(c.warned), 6)} ${dim(String(c.notApplicable))}`
  )
  return [header, HR, ...rows].join('\n')
}

const buildRecommendationSection = (
  recommendations: ReadonlyArray<Recommendation>,
  col: ReturnType<typeof makeColoriser>
): string => {
  if (recommendations.length === 0) return col(GREEN)('  No recommendations — great work! 🏆')

  return recommendations
    .map((rec, i) => {
      const impactColor = rec.impact === 'high' ? RED : rec.impact === 'medium' ? YELLOW : BLUE
      const impactTag = col(impactColor)(`[${rec.impact.toUpperCase()}]`)
      const idBold = col(BOLD)(rec.guidelineId)
      const name = col(DIM)(truncate(rec.guidelineName, 35))
      const statusTag = rec.status === 'fail' ? col(RED)('fail') : col(YELLOW)('warn')
      const heading = `  ${i + 1}. ${impactTag} ${idBold} ${name} (${statusTag})`
      const body = `     ${rec.recommendation}`
      const links =
        rec.resources && rec.resources.length > 0
          ? rec.resources.map((r) => `     ${col(DIM)(r)}`).join('\n')
          : ''
      return [heading, body, ...(links ? [links] : [])].join('\n')
    })
    .join('\n\n')
}

const buildCheckSection = (
  checks: ReadonlyArray<CheckResult>,
  col: ReturnType<typeof makeColoriser>
): string => {
  const bold = col(BOLD)
  const dim = col(DIM)
  const header = `${bold(pad('ID', 6))} ${bold(pad('Guideline', 36))} ${bold(pad('Status', 8))} ${bold(pad('Score', 6))} ${dim('Impact')}`
  const rows = checks.map((c) => {
    const icon = STATUS_ICON[c.status] ?? '?'
    const statusCode = statusColorCode(c.status)
    const statusStr = col(statusCode)(`${icon} ${c.status}`)
    // Pad the status cell to the visual width of 8 chars.  When colours are
    // enabled the ANSI escape sequences add invisible bytes, so we widen the
    // pad target by the length of the wrapping escape codes (open + reset).
    const ansiOverhead = col(statusCode)('').length
    return `${pad(c.guidelineId, 6)} ${pad(truncate(c.guidelineName, 36), 36)} ${pad(statusStr, 8 + ansiOverhead)} ${pad(String(c.score), 6)} ${dim(c.impact)}`
  })
  return [header, HR, ...rows].join('\n')
}

const buildMetricsSection = (
  report: SustainabilityReport,
  col: ReturnType<typeof makeColoriser>
): string => {
  const dim = col(DIM)
  const bold = col(BOLD)
  const lines: string[] = [
    `  ${bold('Page Weight')}:             ${formatBytes(report.metadata.pageWeight)}`,
    `  ${bold('Resource Count')}:          ${report.metadata.requestCount}`,
    `  ${bold('Third-party Resources')}:   ${report.metadata.thirdPartyCount}`,
  ]
  if (report.metadata.co2PerPageView !== undefined)
    lines.push(
      `  ${bold('CO₂ per Page View')}:       ${report.metadata.co2PerPageView.toFixed(4)}g ${dim(`(${report.metadata.co2Model ?? 'swd-v4'})`)}`
    )
  if (report.metadata.isGreenHosted !== undefined)
    lines.push(
      `  ${bold('Green Hosting')}:           ${report.metadata.isGreenHosted ? col(GREEN)('✓ Yes') : col(RED)('✗ No')}`
    )
  return lines.join('\n')
}

// ─── Main formatter ───────────────────────────────────────────────────────────

/**
 * Renders a `SustainabilityReport` as a colourised terminal string.
 *
 * @param report - The report to render.
 * @param options - Optional formatting options.
 * @returns A multi-line string ready to be printed to stdout.
 */
export const formatTerminal = (
  report: SustainabilityReport,
  options: TerminalFormatOptions = {}
): string => {
  const colorsEnabled = options.colors !== false
  const col = makeColoriser(colorsEnabled)

  const bold = col(BOLD)
  const dim = col(DIM)
  const gradeColor = col(gradeAnsi(report.grade))
  const cyan = col(CYAN)

  const sectionHeader = (title: string): string => `\n${bold(cyan(title))}\n${HR}`

  const lines: string[] = [
    '',
    bold('━━━  WSG Sustainability Report  ━━━'),
    '',
    `  ${bold('URL:')}      ${report.url}`,
    `  ${bold('Date:')}     ${new Date(report.timestamp).toUTCString()}`,
    `  ${bold('Duration:')} ${formatDuration(report.duration)}`,
    '',
    HR,
    `  ${bold('Overall Score:')} ${bold(String(report.overallScore))} / 100   ${bold('Grade:')} ${gradeColor(bold(` ${report.grade} `))}`,
    '',
    `  ${col(GREEN)('✓')} Passed:  ${report.summary.passed}`,
    `  ${col(RED)('✗')} Failed:  ${report.summary.failed}`,
    `  ${col(YELLOW)('⚠')} Warned:  ${report.summary.warnings}`,
    `  ${dim('—')} N/A:     ${report.summary.notApplicable}`,
    '',
    sectionHeader('Category Scores'),
    '',
    buildCategorySection(report.categories, col),
    '',
    sectionHeader('Recommendations'),
    '',
    buildRecommendationSection(report.recommendations, col),
    '',
    sectionHeader('Check Results'),
    '',
    buildCheckSection(report.checks, col),
    '',
    sectionHeader('Page Metrics'),
    '',
    buildMetricsSection(report, col),
    '',
    sectionHeader('Methodology'),
    '',
    `  ${dim(report.methodology.disclaimer)}`,
    ...(report.methodology.coreWebVitalsNote
      ? ['', `  ${bold('Core Web Vitals:')} ${report.methodology.coreWebVitalsNote}`]
      : []),
    '',
  ]

  return lines.join('\n')
}
