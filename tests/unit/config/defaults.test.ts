import { describe, it, expect } from 'vitest'
import { DEFAULT_CONFIG } from '@/config/defaults'

describe('DEFAULT_CONFIG', () => {
  it('includes all four categories', () => {
    expect(DEFAULT_CONFIG.categories).toEqual(['ux', 'web-dev', 'hosting', 'business'])
  })

  it('has empty guidelines (run all)', () => {
    expect(DEFAULT_CONFIG.guidelines).toEqual([])
  })

  it('has empty excludeGuidelines', () => {
    expect(DEFAULT_CONFIG.excludeGuidelines).toEqual([])
  })

  it('has a positive timeout', () => {
    expect(DEFAULT_CONFIG.timeout).toBeGreaterThan(0)
  })

  it('has maxDepth of 1 by default', () => {
    expect(DEFAULT_CONFIG.maxDepth).toBe(1)
  })

  it('follows redirects by default', () => {
    expect(DEFAULT_CONFIG.followRedirects).toBe(true)
  })

  it('defaults to terminal format', () => {
    expect(DEFAULT_CONFIG.format).toBe('terminal')
  })

  it('is not verbose by default', () => {
    expect(DEFAULT_CONFIG.verbose).toBe(false)
  })

  it('has a failThreshold of 0', () => {
    expect(DEFAULT_CONFIG.failThreshold).toBe(0)
  })

  it('has no outputPath by default', () => {
    expect(DEFAULT_CONFIG.outputPath).toBeUndefined()
  })
})
