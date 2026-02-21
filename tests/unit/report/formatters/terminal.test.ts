import { describe, it, expect } from 'vitest'
import { formatTerminal } from '@/report/formatters/terminal'
import type { SustainabilityReport } from '@/report/types'
import type { RunResult, CheckResult, CategoryScore } from '@/core/types'
import { fromRunResult } from '@/report/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeCheckResult(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    guidelineId: '3.1',
    guidelineName: 'Test guideline',
    successCriterion: 'Test criterion',
    status: 'pass',
    score: 100,
    message: 'Passed',
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
    ...overrides,
  }
}

function makeCategoryScore(overrides: Partial<CategoryScore> = {}): CategoryScore {
  return {
    category: 'web-dev',
    score: 100,
    totalChecks: 1,
    passed: 1,
    failed: 0,
    warned: 0,
    notApplicable: 0,
    scoredChecks: 1,
    ...overrides,
  }
}

function makeRunResult(overrides: Partial<RunResult> = {}): RunResult {
  return {
    url: 'https://example.com',
    timestamp: '2024-01-01T00:00:00.000Z',
    duration: 1500,
    overallScore: 80,
    categoryScores: [makeCategoryScore()],
    results: [makeCheckResult()],
    co2PerPageView: 0.0012,
    co2Model: 'swd-v4',
    isGreenHosted: false,
    ...overrides,
  }
}

function makeReport(overrides: Partial<RunResult> = {}): SustainabilityReport {
  return fromRunResult(makeRunResult(overrides), 12345, 42, 7)
}

/** Strip all ANSI escape codes from a string for plain-text assertions. */
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g
const stripAnsi = (str: string): string => str.replace(ANSI_RE, '')

// ─── formatTerminal ───────────────────────────────────────────────────────────

describe('formatTerminal', () => {
  it('returns a non-empty string', () => {
    const out = formatTerminal(makeReport(), { colors: false })
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(100)
  })

  it('includes the report URL', () => {
    const out = formatTerminal(makeReport(), { colors: false })
    expect(out).toContain('https://example.com')
  })

  it('includes the overall score and grade', () => {
    const out = formatTerminal(makeReport({ overallScore: 80 }), { colors: false })
    expect(out).toContain('80')
    expect(out).toContain('B')
  })

  it('includes summary pass/fail/warn counts', () => {
    const results = [
      makeCheckResult({ status: 'pass' }),
      makeCheckResult({ status: 'fail', recommendation: 'Fix it', guidelineId: '3.2' }),
      makeCheckResult({ status: 'warn', recommendation: 'Improve it', guidelineId: '3.3' }),
    ]
    const report = fromRunResult(makeRunResult({ results }))
    const out = formatTerminal(report, { colors: false })
    expect(out).toContain('Passed')
    expect(out).toContain('Failed')
    expect(out).toContain('Warned')
  })

  it('contains a Category Scores section', () => {
    const out = formatTerminal(makeReport(), { colors: false })
    expect(out).toContain('Category Scores')
    expect(out).toContain('web-dev')
  })

  it('contains a Recommendations section', () => {
    const out = formatTerminal(makeReport(), { colors: false })
    expect(out).toContain('Recommendations')
  })

  it('shows "no recommendations" when there are none', () => {
    const report = makeReport()
    const out = formatTerminal(report, { colors: false })
    expect(out).toContain('No recommendations')
  })

  it('lists recommendations when present', () => {
    const results = [
      makeCheckResult({
        status: 'fail',
        impact: 'high',
        recommendation: 'Minify assets',
        guidelineId: '3.1',
        guidelineName: 'Performance',
      }),
    ]
    const report = fromRunResult(makeRunResult({ results }))
    const out = formatTerminal(report, { colors: false })
    expect(out).toContain('Minify assets')
    expect(out).toContain('3.1')
  })

  it('contains a Check Results section', () => {
    const out = formatTerminal(makeReport(), { colors: false })
    expect(out).toContain('Check Results')
    expect(out).toContain('3.1')
  })

  it('contains a Page Metrics section', () => {
    const out = formatTerminal(makeReport(), { colors: false })
    expect(out).toContain('Page Metrics')
  })

  it('shows page weight in KB', () => {
    const report = fromRunResult(makeRunResult(), 12345, 42, 7)
    const out = formatTerminal(report, { colors: false })
    expect(out).toContain('KB')
  })

  it('contains a Methodology section', () => {
    const out = formatTerminal(makeReport(), { colors: false })
    expect(out).toContain('Methodology')
  })

  it('does not contain ANSI codes when colors=false', () => {
    const out = formatTerminal(makeReport(), { colors: false })
    expect(out).not.toMatch(ANSI_RE)
  })

  it('contains ANSI codes when colors=true (default)', () => {
    const out = formatTerminal(makeReport())
    expect(out).toMatch(ANSI_RE)
  })

  it('produces the same plain-text content with and without colors', () => {
    const report = makeReport()
    const withColors = stripAnsi(formatTerminal(report, { colors: true }))
    const withoutColors = formatTerminal(report, { colors: false })
    expect(withColors).toBe(withoutColors)
  })

  it('shows green hosting when present', () => {
    const report = fromRunResult(makeRunResult({ isGreenHosted: true }))
    const out = formatTerminal(report, { colors: false })
    expect(out).toContain('Yes')
  })

  it('formats duration in seconds for long runs', () => {
    const report = fromRunResult(makeRunResult({ duration: 2500 }))
    const out = formatTerminal(report, { colors: false })
    expect(out).toContain('2.5s')
  })

  it('formats duration in milliseconds for short runs', () => {
    const report = fromRunResult(makeRunResult({ duration: 800 }))
    const out = formatTerminal(report, { colors: false })
    expect(out).toContain('800ms')
  })
})
