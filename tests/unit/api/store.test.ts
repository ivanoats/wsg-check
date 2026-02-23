import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SustainabilityReport } from '@/report'

const makeReport = (overallScore: number): SustainabilityReport =>
  ({ overallScore }) as SustainabilityReport

describe('api/store', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('saves and finds completed check results', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const { saveCheckResult, findCheckResult } = await import('@/api/store')

    saveCheckResult('check-1', makeReport(80))

    const result = findCheckResult('check-1')
    expect(result).toEqual({
      id: 'check-1',
      status: 'completed',
      report: makeReport(80),
    })
  })

  it('returns undefined for unknown ids', async () => {
    const { findCheckResult } = await import('@/api/store')

    expect(findCheckResult('missing')).toBeUndefined()
  })

  it('evicts expired entries before read and write operations', async () => {
    let now = 1_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)

    const { saveCheckResult, findCheckResult } = await import('@/api/store')

    saveCheckResult('old', makeReport(10))
    now = 3_700_001
    saveCheckResult('new', makeReport(90))

    expect(findCheckResult('old')).toBeUndefined()
    expect(findCheckResult('new')).toEqual({
      id: 'new',
      status: 'completed',
      report: makeReport(90),
    })
  })

  it('evicts the oldest entry when store exceeds max size', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => 5_000)
    const { saveCheckResult, findCheckResult } = await import('@/api/store')

    Array.from({ length: 501 }).forEach((_, index) => {
      saveCheckResult(`id-${index}`, makeReport(index))
    })

    expect(findCheckResult('id-0')).toBeUndefined()
    expect(findCheckResult('id-1')).toEqual({
      id: 'id-1',
      status: 'completed',
      report: makeReport(1),
    })

    nowSpy.mockRestore()
  })
})
