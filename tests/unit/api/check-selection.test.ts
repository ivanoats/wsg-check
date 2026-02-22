import { describe, it, expect } from 'vitest'
import { selectChecks } from '@/api/check-selection'

describe('selectChecks', () => {
  it('returns checks for default categories except business', () => {
    const checks = selectChecks()
    expect(checks.length).toBeGreaterThan(0)
    expect(checks.some((check) => check.guidelineId.startsWith('2.'))).toBe(true)
    expect(checks.some((check) => check.guidelineId.startsWith('3.'))).toBe(true)
    expect(checks.some((check) => check.guidelineId.startsWith('4.'))).toBe(true)
    expect(checks.some((check) => check.guidelineId.startsWith('5.'))).toBe(false)
  })

  it('filters by category set', () => {
    const checks = selectChecks(['hosting'], [])
    expect(checks.length).toBeGreaterThan(0)
    expect(checks.every((check) => check.guidelineId.startsWith('4.'))).toBe(true)
  })

  it('filters by explicit guideline IDs', () => {
    const checks = selectChecks(['web-dev', 'ux', 'hosting'], ['3.1'])
    expect(checks.length).toBeGreaterThan(0)
    expect(checks.every((check) => check.guidelineId === '3.1')).toBe(true)
  })
})
