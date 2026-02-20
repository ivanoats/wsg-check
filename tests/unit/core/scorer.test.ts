import { describe, it, expect } from 'vitest'
import { calculateCategoryScore, calculateOverallScore, scoreResults } from '@/core/scorer'
import type { CheckResult } from '@/core/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<CheckResult> = {}): CheckResult {
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

// ─── calculateOverallScore ────────────────────────────────────────────────────

describe('calculateOverallScore', () => {
  it('returns 100 when there are no results', () => {
    expect(calculateOverallScore([])).toBe(100)
  })

  it('returns 100 when all results are pass', () => {
    const results = [makeResult({ status: 'pass' }), makeResult({ status: 'pass' })]
    expect(calculateOverallScore(results)).toBe(100)
  })

  it('returns 0 when all results are fail', () => {
    const results = [makeResult({ status: 'fail' }), makeResult({ status: 'fail' })]
    expect(calculateOverallScore(results)).toBe(0)
  })

  it('returns 50 when all results are warn', () => {
    const results = [makeResult({ status: 'warn' }), makeResult({ status: 'warn' })]
    expect(calculateOverallScore(results)).toBe(50)
  })

  it('returns 100 when all results are info (non-scoreable)', () => {
    const results = [makeResult({ status: 'info' })]
    expect(calculateOverallScore(results)).toBe(100)
  })

  it('returns 100 when all results are not-applicable', () => {
    const results = [makeResult({ status: 'not-applicable' })]
    expect(calculateOverallScore(results)).toBe(100)
  })

  it('excludes info and not-applicable from score calculation', () => {
    const results = [
      makeResult({ status: 'info', impact: 'high' }),
      makeResult({ status: 'not-applicable', impact: 'high' }),
      makeResult({ status: 'pass', impact: 'medium' }),
    ]
    // Only the pass result contributes → 100
    expect(calculateOverallScore(results)).toBe(100)
  })

  it('applies impact weights correctly (high=3, medium=2, low=1)', () => {
    // high fail (weight 3): 0 pts, medium pass (weight 2): 100 pts
    // weighted = (0*3 + 100*2) / (3+2) = 200/5 = 40
    const results = [
      makeResult({ status: 'fail', impact: 'high' }),
      makeResult({ status: 'pass', impact: 'medium' }),
    ]
    expect(calculateOverallScore(results)).toBe(40)
  })

  it('high impact failures lower the score more than low impact', () => {
    const highFail = [
      makeResult({ status: 'fail', impact: 'high' }),
      makeResult({ status: 'pass', impact: 'low' }),
    ]
    const lowFail = [
      makeResult({ status: 'fail', impact: 'low' }),
      makeResult({ status: 'pass', impact: 'high' }),
    ]
    expect(calculateOverallScore(highFail)).toBeLessThan(calculateOverallScore(lowFail))
  })

  it('rounds to nearest integer', () => {
    // low fail (weight 1): 0, low pass (weight 1): 100, low pass (weight 1): 100
    // (0 + 100 + 100) / 3 = 66.666... → rounds to 67
    const results = [
      makeResult({ status: 'fail', impact: 'low' }),
      makeResult({ status: 'pass', impact: 'low' }),
      makeResult({ status: 'pass', impact: 'low' }),
    ]
    expect(calculateOverallScore(results)).toBe(67)
  })

  it('treats warn as 50 points', () => {
    // warn (weight 2): 50, pass (weight 2): 100
    // (50*2 + 100*2) / (2+2) = 300/4 = 75
    const results = [
      makeResult({ status: 'warn', impact: 'medium' }),
      makeResult({ status: 'pass', impact: 'medium' }),
    ]
    expect(calculateOverallScore(results)).toBe(75)
  })

  it('treats missing impact weight as 1 (fallback)', () => {
    const result = makeResult({ status: 'pass', impact: 'low' })
    expect(calculateOverallScore([result])).toBe(100)
  })
})

// ─── calculateCategoryScore ───────────────────────────────────────────────────

describe('calculateCategoryScore', () => {
  it('returns score 100 and zero counts for an empty result set', () => {
    const score = calculateCategoryScore([], 'web-dev')
    expect(score.score).toBe(100)
    expect(score.totalChecks).toBe(0)
    expect(score.passed).toBe(0)
    expect(score.failed).toBe(0)
    expect(score.warned).toBe(0)
    expect(score.notApplicable).toBe(0)
    expect(score.scoredChecks).toBe(0)
  })

  it('filters to the correct category', () => {
    const results = [
      makeResult({ category: 'web-dev', status: 'pass' }),
      makeResult({ category: 'ux', status: 'fail' }),
      makeResult({ category: 'hosting', status: 'fail' }),
    ]
    const score = calculateCategoryScore(results, 'web-dev')
    expect(score.totalChecks).toBe(1)
    expect(score.passed).toBe(1)
    expect(score.failed).toBe(0)
    expect(score.score).toBe(100)
  })

  it('counts passed, failed, warned, and notApplicable correctly', () => {
    const results = [
      makeResult({ category: 'web-dev', status: 'pass' }),
      makeResult({ category: 'web-dev', status: 'fail' }),
      makeResult({ category: 'web-dev', status: 'warn' }),
      makeResult({ category: 'web-dev', status: 'not-applicable' }),
      makeResult({ category: 'web-dev', status: 'info' }),
    ]
    const score = calculateCategoryScore(results, 'web-dev')
    expect(score.totalChecks).toBe(5)
    expect(score.passed).toBe(1)
    expect(score.failed).toBe(1)
    expect(score.warned).toBe(1)
    expect(score.notApplicable).toBe(1)
    // scoredChecks: pass + fail + warn = 3
    expect(score.scoredChecks).toBe(3)
  })

  it('returns the category field correctly', () => {
    const score = calculateCategoryScore([], 'hosting')
    expect(score.category).toBe('hosting')
  })

  it('includes impact weighting in category score', () => {
    const results = [
      makeResult({ category: 'ux', status: 'fail', impact: 'high' }),
      makeResult({ category: 'ux', status: 'pass', impact: 'low' }),
    ]
    // high fail (3): 0, low pass (1): 100 → (0*3 + 100*1) / 4 = 25
    const score = calculateCategoryScore(results, 'ux')
    expect(score.score).toBe(25)
  })
})

// ─── scoreResults ─────────────────────────────────────────────────────────────

describe('scoreResults', () => {
  it('returns all four categories even when results are empty', () => {
    const { categoryScores } = scoreResults([])
    const cats = categoryScores.map((c) => c.category)
    expect(cats).toContain('ux')
    expect(cats).toContain('web-dev')
    expect(cats).toContain('hosting')
    expect(cats).toContain('business')
    expect(categoryScores).toHaveLength(4)
  })

  it('calculates the correct overallScore', () => {
    const results = [
      makeResult({ status: 'pass', impact: 'medium' }),
      makeResult({ status: 'fail', impact: 'medium' }),
    ]
    const { overallScore } = scoreResults(results)
    // (100*2 + 0*2) / (2+2) = 50
    expect(overallScore).toBe(50)
  })

  it('reflects per-category results in categoryScores', () => {
    const results = [
      makeResult({ category: 'web-dev', status: 'pass', impact: 'medium' }),
      makeResult({ category: 'ux', status: 'fail', impact: 'medium' }),
    ]
    const { categoryScores } = scoreResults(results)
    const webDev = categoryScores.find((c) => c.category === 'web-dev')!
    const ux = categoryScores.find((c) => c.category === 'ux')!

    expect(webDev.score).toBe(100)
    expect(ux.score).toBe(0)
  })

  it('categories with no results score 100', () => {
    const results = [makeResult({ category: 'web-dev', status: 'fail', impact: 'high' })]
    const { categoryScores } = scoreResults(results)
    const hosting = categoryScores.find((c) => c.category === 'hosting')!
    expect(hosting.score).toBe(100)
    expect(hosting.totalChecks).toBe(0)
  })

  it('returns overallScore 100 when there are no results', () => {
    const { overallScore } = scoreResults([])
    expect(overallScore).toBe(100)
  })

  it('business category is included in results', () => {
    const { categoryScores } = scoreResults([makeResult({ category: 'business', status: 'pass' })])
    const business = categoryScores.find((c) => c.category === 'business')!
    expect(business).toBeDefined()
    expect(business.totalChecks).toBe(1)
    expect(business.score).toBe(100)
  })
})
