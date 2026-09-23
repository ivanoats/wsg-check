import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkGreenHosting, estimateCO2 } from '@/utils/carbon-estimator'

// Keep the real CO2.js exports so an incorrect API shape cannot hide behind a mock.
describe('CO2.js integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([true, false])('returns the hosting API green value %s', async (green) => {
    const fetch = vi.fn().mockResolvedValue({ json: async () => ({ green }) })
    vi.stubGlobal('fetch', fetch)

    expect(await checkGreenHosting('example.com')).toBe(green)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.thegreenwebfoundation.org/greencheck/example.com',
      expect.any(Object)
    )
  })

  it('falls back to false when the real library cannot reach the hosting API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await checkGreenHosting('example.com')).toBe(false)
  })

  it('calculates finite emissions and reduces them for green hosting', () => {
    const regular = estimateCO2(1024 * 1024, false)
    const green = estimateCO2(1024 * 1024, true)
    expect(Number.isFinite(regular)).toBe(true)
    expect(green).toBeGreaterThan(0)
    expect(green).toBeLessThan(regular)
    expect(estimateCO2(0, false)).toBe(0)
  })
})
