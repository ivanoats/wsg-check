import { describe, it, expect } from 'vitest'
import { formatMarkdown } from '@/report/formatters/markdown'
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

// ─── formatMarkdown ───────────────────────────────────────────────────────────

describe('formatMarkdown', () => {
  it('returns a non-empty string', () => {
    const md = formatMarkdown(makeReport())
    expect(typeof md).toBe('string')
    expect(md.length).toBeGreaterThan(100)
  })

  it('includes the report URL', () => {
    const md = formatMarkdown(makeReport())
    expect(md).toContain('https://example.com')
  })

  it('includes the overall score and grade', () => {
    const md = formatMarkdown(makeReport({ overallScore: 80 }))
    expect(md).toContain('80')
    expect(md).toContain('B')
  })

  it('starts with a level-1 heading', () => {
    const md = formatMarkdown(makeReport())
    expect(md).toMatch(/^# WSG Sustainability Report/)
  })

  it('contains a Category Scores section', () => {
    const md = formatMarkdown(makeReport())
    expect(md).toContain('## Category Scores')
    expect(md).toContain('web-dev')
  })

  it('contains a Recommendations section', () => {
    const md = formatMarkdown(makeReport())
    expect(md).toContain('## Recommendations')
  })

  it('shows "No recommendations" when there are none', () => {
    const report = makeReport()
    const md = formatMarkdown(report)
    // The default fixture produces no recommendations (pass check, no recommendation string)
    expect(md).toContain('No recommendations')
  })

  it('lists numbered recommendations when present', () => {
    const results = [
      makeCheckResult({
        status: 'fail',
        impact: 'high',
        recommendation: 'Fix minification',
        guidelineId: '3.1',
        guidelineName: 'Performance Goals',
      }),
    ]
    const report = fromRunResult(makeRunResult({ results }))
    const md = formatMarkdown(report)
    expect(md).toContain('1.')
    expect(md).toContain('Fix minification')
    expect(md).toContain('3.1')
  })

  it('escapes backslash characters in guideline names', () => {
    const results = [makeCheckResult({ guidelineName: 'Path\\to\\resource', status: 'pass' })]
    const report = fromRunResult(makeRunResult({ results }))
    const md = formatMarkdown(report)
    expect(md).toContain('Path\\\\to\\\\resource')
  })

  it('contains a Check Results section with guideline IDs', () => {
    const md = formatMarkdown(makeReport())
    expect(md).toContain('## Check Results')
    expect(md).toContain('3.1')
  })

  it('contains a Page Metrics section with byte counts', () => {
    const md = formatMarkdown(makeReport())
    expect(md).toContain('## Page Metrics')
    expect(md).toContain('KB')
  })

  it('contains the Methodology section with disclaimer', () => {
    const md = formatMarkdown(makeReport())
    expect(md).toContain('## Methodology')
    expect(md).toContain('static')
  })

  it('escapes pipe characters in guideline names to avoid broken tables', () => {
    const results = [makeCheckResult({ guidelineName: 'Foo | Bar', status: 'pass' })]
    const report = fromRunResult(makeRunResult({ results }))
    const md = formatMarkdown(report)
    expect(md).toContain('Foo \\| Bar')
  })

  it('formats duration in seconds for long runs', () => {
    const report = fromRunResult(makeRunResult({ duration: 2500 }))
    const md = formatMarkdown(report)
    expect(md).toContain('2.5s')
  })

  it('formats duration in milliseconds for short runs', () => {
    const report = fromRunResult(makeRunResult({ duration: 500 }))
    const md = formatMarkdown(report)
    expect(md).toContain('500ms')
  })

  it('includes CO₂ per page view when present', () => {
    const report = fromRunResult(makeRunResult({ co2PerPageView: 0.0025 }))
    const md = formatMarkdown(report)
    expect(md).toContain('0.0025')
  })

  it('shows green hosting status', () => {
    const report = fromRunResult(makeRunResult({ isGreenHosted: true }))
    const md = formatMarkdown(report)
    expect(md).toContain('Yes')
  })
})
