import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPerByte = vi.fn()
const mockHostingCheck = vi.fn()

vi.mock('@tgwf/co2', () => ({
  co2: class MockCO2 {
  constructor(_options: unknown) {} // eslint-disable-line @typescript-eslint/no-unused-vars
    perByte = mockPerByte
  },
  hosting: {
    check: mockHostingCheck,
  },
}))

// Import after vi.mock so mocks are in place
const { estimateCO2, checkGreenHosting, CO2_MODEL } = await import('@/utils/carbon-estimator')

// ─── CO2_MODEL constant ───────────────────────────────────────────────────────

describe('CO2_MODEL', () => {
  it('equals "swd-v4"', () => {
    expect(CO2_MODEL).toBe('swd-v4')
  })
})

// ─── estimateCO2 ──────────────────────────────────────────────────────────────

describe('estimateCO2', () => {
  beforeEach(() => {
    mockPerByte.mockReset()
  })

  it('returns the number result directly when perByte returns a number', () => {
    mockPerByte.mockReturnValueOnce(0.5)
    const result = estimateCO2(100_000, false)
    expect(result).toBe(0.5)
  })

  it('extracts the total from a component object when perByte returns an object', () => {
    mockPerByte.mockReturnValueOnce({
      networkCO2: 0.1,
      dataCenterCO2: 0.2,
      consumerDeviceCO2: 0.05,
      productionCO2: 0.02,
      total: 0.37,
    })
    const result = estimateCO2(500_000, false)
    expect(result).toBe(0.37)
  })

  it('rounds to 4 decimal places', () => {
    mockPerByte.mockReturnValueOnce(0.123456789)
    const result = estimateCO2(100_000, false)
    expect(result).toBe(0.1235)
  })

  it('passes bytes and isGreenHosted to co2.perByte', () => {
    mockPerByte.mockReturnValueOnce(0.1)
    estimateCO2(200_000, true)
    expect(mockPerByte).toHaveBeenCalledWith(200_000, true)
  })

  it('passes isGreenHosted=false correctly', () => {
    mockPerByte.mockReturnValueOnce(0.2)
    estimateCO2(200_000, false)
    expect(mockPerByte).toHaveBeenCalledWith(200_000, false)
  })

  it('returns 0 when bytes is 0', () => {
    mockPerByte.mockReturnValueOnce(0)
    const result = estimateCO2(0, false)
    expect(result).toBe(0)
  })
})

// ─── checkGreenHosting ────────────────────────────────────────────────────────

describe('checkGreenHosting', () => {
  beforeEach(() => {
    mockHostingCheck.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when the hosting API reports the domain as green', async () => {
    mockHostingCheck.mockResolvedValueOnce(true)
    const result = await checkGreenHosting('green-host.com')
    expect(result).toBe(true)
  })

  it('returns false when the hosting API reports the domain is not green', async () => {
    mockHostingCheck.mockResolvedValueOnce(false)
    const result = await checkGreenHosting('regular-host.com')
    expect(result).toBe(false)
  })

  it('passes the domain to hosting.check', async () => {
    mockHostingCheck.mockResolvedValueOnce(false)
    await checkGreenHosting('example.com')
    expect(mockHostingCheck).toHaveBeenCalledWith('example.com')
  })

  it('returns false when the hosting API throws a network error', async () => {
    mockHostingCheck.mockRejectedValueOnce(new Error('Network error'))
    const result = await checkGreenHosting('example.com')
    expect(result).toBe(false)
  })

  it('returns false when the hosting API rejects with a non-Error value', async () => {
    mockHostingCheck.mockRejectedValueOnce('timeout')
    const result = await checkGreenHosting('example.com')
    expect(result).toBe(false)
  })

  it('coerces a truthy non-boolean result to true', async () => {
    mockHostingCheck.mockResolvedValueOnce(1)
    const result = await checkGreenHosting('example.com')
    expect(result).toBe(true)
  })
})
