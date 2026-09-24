import { describe, it, expect } from 'vitest'
import { findGuidelineById, loadGuidelines } from '@/api/guidelines'
import { GUIDELINES_REGISTRY, WSG_SPEC } from '@/config/index'

describe('loadGuidelines', () => {
  it('returns the registry for the targeted spec release', () => {
    const result = loadGuidelines()

    expect(result.spec).toBe(WSG_SPEC)
    expect(result.guidelines).toBe(GUIDELINES_REGISTRY)
  })
})

describe('findGuidelineById', () => {
  it('finds a guideline by slug', () => {
    const result = findGuidelineById('use-sustainable-hosting')

    expect(result.spec).toBe(WSG_SPEC)
    expect(result.guideline?.id).toBe('use-sustainable-hosting')
  })

  it('finds a guideline by legacy numeric ID', () => {
    expect(findGuidelineById('3.3').guideline?.id).toBe('minify-and-remove-unused-code')
  })

  it('returns no guideline for an unknown ID', () => {
    const result = findGuidelineById('9.9')

    expect(result.spec).toBe(WSG_SPEC)
    expect(result.guideline).toBeUndefined()
  })
})
