/**
 * Shared test fixture factory functions for the report module unit tests.
 *
 * Centralising these helpers prevents duplication across the report test suite
 * and ensures default values stay consistent.
 */
import type { RunResult, CheckResult, CategoryScore } from '@/core/types'

export const makeCheckResult = (overrides: Partial<CheckResult> = {}): CheckResult => ({
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
})

export const makeCategoryScore = (overrides: Partial<CategoryScore> = {}): CategoryScore => ({
  category: 'web-dev',
  score: 100,
  totalChecks: 1,
  passed: 1,
  failed: 0,
  warned: 0,
  notApplicable: 0,
  scoredChecks: 1,
  ...overrides,
})

export const makeRunResult = (overrides: Partial<RunResult> = {}): RunResult => ({
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
})
