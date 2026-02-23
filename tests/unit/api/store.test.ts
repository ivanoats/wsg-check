import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SustainabilityReport } from '@/report/index'

describe('store', () => {
  let saveCheckResult: (id: string, report: SustainabilityReport) => void
  let findCheckResult: (
    id: string
  ) =>
    | { readonly id: string; readonly status: 'completed'; readonly report: SustainabilityReport }
    | undefined

  beforeEach(async () => {
    vi.resetModules()
    const module = await import('@/api/store')
    saveCheckResult = module.saveCheckResult
    findCheckResult = module.findCheckResult
  })

  const makeReport = (score = 85): SustainabilityReport =>
    ({ overallScore: score }) as unknown as SustainabilityReport

  it('saves and retrieves a result by id', () => {
    const report = makeReport()
    saveCheckResult('id-1', report)
    const result = findCheckResult('id-1')
    expect(result).not.toBeUndefined()
    expect(result?.id).toBe('id-1')
    expect(result?.status).toBe('completed')
    expect(result?.report).toBe(report)
  })

  it('returns undefined for an unknown id', () => {
    expect(findCheckResult('does-not-exist')).toBeUndefined()
  })

  it('evicts expired entries on findCheckResult', () => {
    vi.useFakeTimers()
    try {
      const report = makeReport()
      saveCheckResult('expired', report)
      vi.advanceTimersByTime(1000 * 60 * 60 + 1) // past 1-hour TTL
      expect(findCheckResult('expired')).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('evicts expired entries on saveCheckResult', () => {
    vi.useFakeTimers()
    try {
      saveCheckResult('will-expire', makeReport())
      vi.advanceTimersByTime(1000 * 60 * 60 + 1) // past 1-hour TTL
      saveCheckResult('new-entry', makeReport(90))
      expect(findCheckResult('will-expire')).toBeUndefined()
      expect(findCheckResult('new-entry')).not.toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('evicts the oldest entry when the store exceeds 500 results', () => {
    const report = makeReport()
    for (let i = 0; i < 500; i++) {
      saveCheckResult(`item-${i}`, report)
    }
    expect(findCheckResult('item-0')).not.toBeUndefined()
    saveCheckResult('item-overflow', report)
    expect(findCheckResult('item-0')).toBeUndefined()
    expect(findCheckResult('item-overflow')).not.toBeUndefined()
  })
})
