import { describe, it, expect } from 'vitest'
import {
  GUIDELINES_REGISTRY,
  getGuidelineById,
  getGuidelinesByCategory,
  getGuidelinesByTestability,
} from '@/config/guidelines-registry'

describe('GUIDELINES_REGISTRY', () => {
  it('is a non-empty array', () => {
    expect(GUIDELINES_REGISTRY.length).toBeGreaterThan(0)
  })

  it('contains guidelines from all four categories', () => {
    const categories = new Set(GUIDELINES_REGISTRY.map((g) => g.category))
    expect(categories).toContain('ux')
    expect(categories).toContain('web-dev')
    expect(categories).toContain('hosting')
    expect(categories).toContain('business')
  })

  it('contains guidelines with all three testability levels', () => {
    const levels = new Set(GUIDELINES_REGISTRY.map((g) => g.testability))
    expect(levels).toContain('automated')
    expect(levels).toContain('semi-automated')
    expect(levels).toContain('manual-only')
  })

  it('has unique IDs', () => {
    const ids = GUIDELINES_REGISTRY.map((g) => g.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('each entry has required fields', () => {
    for (const guideline of GUIDELINES_REGISTRY) {
      expect(guideline.id).toBeTruthy()
      expect(guideline.title).toBeTruthy()
      expect(guideline.section).toBeTruthy()
      expect(guideline.category).toBeTruthy()
      expect(guideline.testability).toBeTruthy()
      expect(guideline.description).toBeTruthy()
    }
  })
})

describe('getGuidelineById', () => {
  it('returns the correct guideline for a known ID', () => {
    const guideline = getGuidelineById('3.3')
    expect(guideline).toBeDefined()
    expect(guideline?.title).toContain('Minify')
  })

  it('returns undefined for an unknown ID', () => {
    expect(getGuidelineById('99.99')).toBeUndefined()
  })
})

describe('getGuidelinesByCategory', () => {
  it('returns only ux guidelines', () => {
    const results = getGuidelinesByCategory('ux')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((g) => g.category === 'ux')).toBe(true)
  })

  it('returns only hosting guidelines', () => {
    const results = getGuidelinesByCategory('hosting')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((g) => g.category === 'hosting')).toBe(true)
  })
})

describe('getGuidelinesByTestability', () => {
  it('returns only automated guidelines', () => {
    const results = getGuidelinesByTestability('automated')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((g) => g.testability === 'automated')).toBe(true)
  })

  it('returns only manual-only guidelines', () => {
    const results = getGuidelinesByTestability('manual-only')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((g) => g.testability === 'manual-only')).toBe(true)
  })
})
