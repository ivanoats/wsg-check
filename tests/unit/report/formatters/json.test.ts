import { describe, it, expect } from 'vitest'
import { formatJson } from '@/report/formatters/json'
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

// ─── formatJson ───────────────────────────────────────────────────────────────

describe('formatJson', () => {
  it('returns a valid JSON string', () => {
    const report = makeReport()
    const json = formatJson(report)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('round-trips the report object', () => {
    const report = makeReport()
    const parsed = JSON.parse(formatJson(report))
    expect(parsed.url).toBe(report.url)
    expect(parsed.overallScore).toBe(report.overallScore)
    expect(parsed.grade).toBe(report.grade)
  })

  it('uses 2-space indentation by default', () => {
    const report = makeReport()
    const json = formatJson(report)
    expect(json).toContain('  "url"')
  })

  it('produces compact output when indent=0', () => {
    const report = makeReport()
    const json = formatJson(report, 0)
    expect(json).not.toContain('\n')
  })

  it('includes all top-level report fields', () => {
    const report = makeReport()
    const parsed = JSON.parse(formatJson(report))
    const expectedKeys = [
      'url',
      'timestamp',
      'duration',
      'overallScore',
      'grade',
      'categories',
      'checks',
      'summary',
      'recommendations',
      'metadata',
      'methodology',
    ]
    for (const key of expectedKeys) {
      expect(parsed).toHaveProperty(key)
    }
  })
})
