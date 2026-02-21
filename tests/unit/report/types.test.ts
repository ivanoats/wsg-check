import { describe, it, expect } from 'vitest'
import { scoreToGrade, fromRunResult, STATIC_ANALYSIS_DISCLAIMER } from '@/report/types'
import type { Grade, SustainabilityReport } from '@/report/types'
import type { RunResult, CheckResult, CategoryScore } from '@/core/types'

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

// ─── scoreToGrade ─────────────────────────────────────────────────────────────

describe('scoreToGrade', () => {
  it('returns A for score >= 90', () => {
    expect(scoreToGrade(90)).toBe<Grade>('A')
    expect(scoreToGrade(95)).toBe<Grade>('A')
    expect(scoreToGrade(100)).toBe<Grade>('A')
  })

  it('returns B for score 75–89', () => {
    expect(scoreToGrade(75)).toBe<Grade>('B')
    expect(scoreToGrade(80)).toBe<Grade>('B')
    expect(scoreToGrade(89)).toBe<Grade>('B')
  })

  it('returns C for score 60–74', () => {
    expect(scoreToGrade(60)).toBe<Grade>('C')
    expect(scoreToGrade(67)).toBe<Grade>('C')
    expect(scoreToGrade(74)).toBe<Grade>('C')
  })

  it('returns D for score 45–59', () => {
    expect(scoreToGrade(45)).toBe<Grade>('D')
    expect(scoreToGrade(52)).toBe<Grade>('D')
    expect(scoreToGrade(59)).toBe<Grade>('D')
  })

  it('returns F for score < 45', () => {
    expect(scoreToGrade(0)).toBe<Grade>('F')
    expect(scoreToGrade(44)).toBe<Grade>('F')
    expect(scoreToGrade(30)).toBe<Grade>('F')
  })
})

// ─── fromRunResult ────────────────────────────────────────────────────────────

describe('fromRunResult', () => {
  it('preserves url, timestamp, and duration from RunResult', () => {
    const runResult = makeRunResult()
    const report = fromRunResult(runResult)
    expect(report.url).toBe('https://example.com')
    expect(report.timestamp).toBe('2024-01-01T00:00:00.000Z')
    expect(report.duration).toBe(1500)
  })

  it('preserves overallScore from RunResult', () => {
    const report = fromRunResult(makeRunResult({ overallScore: 72 }))
    expect(report.overallScore).toBe(72)
  })

  it('derives the grade from overallScore', () => {
    expect(fromRunResult(makeRunResult({ overallScore: 95 })).grade).toBe<Grade>('A')
    expect(fromRunResult(makeRunResult({ overallScore: 80 })).grade).toBe<Grade>('B')
    expect(fromRunResult(makeRunResult({ overallScore: 65 })).grade).toBe<Grade>('C')
    expect(fromRunResult(makeRunResult({ overallScore: 50 })).grade).toBe<Grade>('D')
    expect(fromRunResult(makeRunResult({ overallScore: 30 })).grade).toBe<Grade>('F')
  })

  it('copies categoryScores into categories', () => {
    const categoryScores = [makeCategoryScore({ category: 'hosting', score: 60 })]
    const report = fromRunResult(makeRunResult({ categoryScores }))
    expect(report.categories).toEqual(categoryScores)
  })

  it('copies results into checks', () => {
    const results = [makeCheckResult({ guidelineId: '4.1', status: 'fail', score: 0 })]
    const report = fromRunResult(makeRunResult({ results }))
    expect(report.checks).toEqual(results)
  })

  describe('summary', () => {
    it('counts passed checks correctly', () => {
      const results = [
        makeCheckResult({ status: 'pass' }),
        makeCheckResult({ status: 'pass' }),
        makeCheckResult({ status: 'fail' }),
      ]
      const report = fromRunResult(makeRunResult({ results }))
      expect(report.summary.totalChecks).toBe(3)
      expect(report.summary.passed).toBe(2)
      expect(report.summary.failed).toBe(1)
      expect(report.summary.warnings).toBe(0)
    })

    it('counts warned checks correctly', () => {
      const results = [makeCheckResult({ status: 'warn' }), makeCheckResult({ status: 'warn' })]
      const report = fromRunResult(makeRunResult({ results }))
      expect(report.summary.warnings).toBe(2)
    })

    it('counts info and not-applicable as notApplicable', () => {
      const results = [
        makeCheckResult({ status: 'info' }),
        makeCheckResult({ status: 'not-applicable' }),
      ]
      const report = fromRunResult(makeRunResult({ results }))
      expect(report.summary.notApplicable).toBe(2)
      expect(report.summary.totalChecks).toBe(2)
    })
  })

  describe('recommendations', () => {
    it('includes recommendations only for fail and warn results with a recommendation string', () => {
      const results = [
        makeCheckResult({ status: 'pass' }),
        makeCheckResult({
          status: 'fail',
          recommendation: 'Fix the issue',
          guidelineId: '3.1',
          guidelineName: 'Test',
        }),
        makeCheckResult({
          status: 'warn',
          recommendation: 'Improve this',
          guidelineId: '3.2',
          guidelineName: 'Test2',
        }),
        makeCheckResult({ status: 'info' }),
      ]
      const report = fromRunResult(makeRunResult({ results }))
      expect(report.recommendations).toHaveLength(2)
    })

    it('excludes fail/warn results without a recommendation string', () => {
      const results = [
        makeCheckResult({ status: 'fail' }), // no recommendation field
      ]
      const report = fromRunResult(makeRunResult({ results }))
      expect(report.recommendations).toHaveLength(0)
    })

    it('sorts recommendations: high impact before medium before low', () => {
      const results = [
        makeCheckResult({
          status: 'fail',
          impact: 'low',
          recommendation: 'Low fix',
          guidelineId: '1',
        }),
        makeCheckResult({
          status: 'fail',
          impact: 'high',
          recommendation: 'High fix',
          guidelineId: '2',
        }),
        makeCheckResult({
          status: 'fail',
          impact: 'medium',
          recommendation: 'Med fix',
          guidelineId: '3',
        }),
      ]
      const report = fromRunResult(makeRunResult({ results }))
      expect(report.recommendations[0].impact).toBe('high')
      expect(report.recommendations[1].impact).toBe('medium')
      expect(report.recommendations[2].impact).toBe('low')
    })

    it('sorts fail before warn within the same impact tier', () => {
      const results = [
        makeCheckResult({
          status: 'warn',
          impact: 'high',
          recommendation: 'Warn fix',
          guidelineId: '1',
        }),
        makeCheckResult({
          status: 'fail',
          impact: 'high',
          recommendation: 'Fail fix',
          guidelineId: '2',
        }),
      ]
      const report = fromRunResult(makeRunResult({ results }))
      expect(report.recommendations[0].status).toBe('fail')
      expect(report.recommendations[1].status).toBe('warn')
    })

    it('includes resources when present on the check result', () => {
      const results = [
        makeCheckResult({
          status: 'fail',
          recommendation: 'Fix this',
          resources: ['https://www.w3.org/TR/web-sustainability-guidelines/'],
        }),
      ]
      const report = fromRunResult(makeRunResult({ results }))
      expect(report.recommendations[0].resources).toEqual([
        'https://www.w3.org/TR/web-sustainability-guidelines/',
      ])
    })
  })

  describe('metadata', () => {
    it('includes co2PerPageView from RunResult', () => {
      const report = fromRunResult(makeRunResult({ co2PerPageView: 0.0025 }))
      expect(report.metadata.co2PerPageView).toBe(0.0025)
    })

    it('includes co2Model from RunResult', () => {
      const report = fromRunResult(makeRunResult({ co2Model: 'swd-v4' }))
      expect(report.metadata.co2Model).toBe('swd-v4')
    })

    it('includes isGreenHosted from RunResult', () => {
      const report = fromRunResult(makeRunResult({ isGreenHosted: true }))
      expect(report.metadata.isGreenHosted).toBe(true)
    })

    it('accepts optional pageWeight, requestCount, thirdPartyCount', () => {
      const report = fromRunResult(makeRunResult(), 12345, 42, 7)
      expect(report.metadata.pageWeight).toBe(12345)
      expect(report.metadata.requestCount).toBe(42)
      expect(report.metadata.thirdPartyCount).toBe(7)
    })

    it('defaults pageWeight, requestCount, thirdPartyCount to 0 when not provided', () => {
      const report = fromRunResult(makeRunResult())
      expect(report.metadata.pageWeight).toBe(0)
      expect(report.metadata.requestCount).toBe(0)
      expect(report.metadata.thirdPartyCount).toBe(0)
    })
  })

  describe('methodology', () => {
    it('sets analysisType to static', () => {
      const report = fromRunResult(makeRunResult())
      expect(report.methodology.analysisType).toBe('static')
    })

    it('includes the static analysis disclaimer', () => {
      const report = fromRunResult(makeRunResult())
      expect(report.methodology.disclaimer).toBe(STATIC_ANALYSIS_DISCLAIMER)
    })

    it('sets co2EstimationModel from RunResult co2Model', () => {
      const report = fromRunResult(makeRunResult({ co2Model: 'swd-v4' }))
      expect(report.methodology.co2EstimationModel).toBe('swd-v4')
    })

    it('includes a coreWebVitalsNote with the page URL (encoded)', () => {
      const report = fromRunResult(makeRunResult({ url: 'https://example.com' }))
      expect(report.methodology.coreWebVitalsNote).toContain('https%3A%2F%2Fexample.com')
      expect(report.methodology.coreWebVitalsNote).toContain('pagespeed.web.dev')
    })
  })
})

// ─── STATIC_ANALYSIS_DISCLAIMER ──────────────────────────────────────────────

describe('STATIC_ANALYSIS_DISCLAIMER', () => {
  it('is a non-empty string', () => {
    expect(typeof STATIC_ANALYSIS_DISCLAIMER).toBe('string')
    expect(STATIC_ANALYSIS_DISCLAIMER.length).toBeGreaterThan(50)
  })

  it('references static analysis limitations', () => {
    expect(STATIC_ANALYSIS_DISCLAIMER).toContain('static')
  })

  it('references PageSpeed Insights', () => {
    expect(STATIC_ANALYSIS_DISCLAIMER).toContain('pagespeed.web.dev')
  })
})

// ─── Type-level checks ────────────────────────────────────────────────────────

describe('SustainabilityReport shape', () => {
  it('produces a correctly shaped report object', () => {
    const report: SustainabilityReport = fromRunResult(makeRunResult())
    // Structural assertions — verify all top-level keys are present
    expect(report).toHaveProperty('url')
    expect(report).toHaveProperty('timestamp')
    expect(report).toHaveProperty('duration')
    expect(report).toHaveProperty('overallScore')
    expect(report).toHaveProperty('grade')
    expect(report).toHaveProperty('categories')
    expect(report).toHaveProperty('checks')
    expect(report).toHaveProperty('summary')
    expect(report).toHaveProperty('recommendations')
    expect(report).toHaveProperty('metadata')
    expect(report).toHaveProperty('methodology')
  })
})
