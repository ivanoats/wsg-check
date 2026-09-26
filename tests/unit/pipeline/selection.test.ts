import { describe, it, expect } from 'vitest'
import { selectChecks } from '@/pipeline/index'

const checksFor = (...args: Parameters<typeof selectChecks>) => selectChecks(...args).checks

describe('selectChecks', () => {
  it('returns checks for default categories except business', () => {
    const checks = checksFor()
    expect(checks.length).toBeGreaterThan(0)
    expect(checks.some((check) => check.guidelineId.startsWith('2.'))).toBe(true)
    expect(checks.some((check) => check.guidelineId.startsWith('3.'))).toBe(true)
    expect(checks.some((check) => check.guidelineId.startsWith('4.'))).toBe(true)
    expect(checks.some((check) => check.guidelineId.startsWith('5.'))).toBe(false)
  })

  it('filters by category set', () => {
    const checks = checksFor(['hosting'], [])
    expect(checks.length).toBeGreaterThan(0)
    expect(checks.every((check) => check.guidelineId.startsWith('4.'))).toBe(true)
  })

  it('filters by explicit guideline IDs', () => {
    const checks = checksFor(['web-dev', 'ux', 'hosting'], ['3.1'])
    expect(checks.length).toBeGreaterThan(0)
    expect(checks.every((check) => check.guidelineId === '3.1')).toBe(true)
  })

  it('filters by guideline slug, matching checks that still use legacy IDs', () => {
    const checks = checksFor(['web-dev'], ['minify-and-remove-unused-code'])
    expect(checks.length).toBeGreaterThan(0)
    expect(checks.every((check) => check.guidelineId === '3.3')).toBe(true)
  })

  it('returns no checks for an unknown guideline ID', () => {
    expect(checksFor(['web-dev', 'ux', 'hosting'], ['no-such-guideline'])).toHaveLength(0)
  })

  it('does not select the alt-text check for the downloadable-documents slug', () => {
    // Alt text and downloadable documents both report legacy 2.17; only the
    // documents check implements this July-2026 guideline.
    const bySlug = checksFor(['ux'], ['reduce-the-impact-of-downloadable-and-physical-documents'])
    expect(bySlug).toHaveLength(1)
    expect(bySlug[0]?.guidelineSlug).toBe(
      'reduce-the-impact-of-downloadable-and-physical-documents'
    )

    const byLegacyId = checksFor(['ux'], ['2.17'])
    expect(byLegacyId).toHaveLength(2)
  })

  it('selects a related check by its related ID', () => {
    const checks = checksFor(['web-dev'], ['security-headers'])
    expect(checks).toHaveLength(1)
    expect(checks[0]?.relatedId).toBe('security-headers')
  })

  it('reports no notices for a plain request', () => {
    expect(selectChecks(['web-dev'], ['minify-and-remove-unused-code']).notices).toEqual([])
  })

  it('notes that the business category has no checks', () => {
    const { checks, notices } = selectChecks(['business'])
    expect(checks).toHaveLength(0)
    expect(notices).toEqual([
      {
        level: 'note',
        message: 'the "business" category has no automated checks in the current version.',
      },
    ])
  })

  it('warns about deprecated numeric IDs, naming the replacement', () => {
    const { notices } = selectChecks(['web-dev'], ['3.3'])
    expect(notices).toEqual([
      {
        level: 'warning',
        message:
          'numeric guideline ID "3.3" is deprecated; use "minify-and-remove-unused-code" (WSG July-2026).',
      },
    ])
  })
})
