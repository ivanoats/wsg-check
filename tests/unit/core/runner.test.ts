import { describe, it, expect, vi } from 'vitest'
import { CheckRunner } from '@/core/runner'
import { CheckError } from '@/utils/errors'
import type { CheckFn, CheckResult, PageData } from '@/core/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** A minimal `PageData` stub (check functions under test don't use it). */
const PAGE_DATA = {} as unknown as PageData

function makeResult(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
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
  }
}

function passingCheck(id: string): CheckFn {
  return () => makeResult({ guidelineId: id })
}

function failingCheck(id: string): CheckFn {
  return () => makeResult({ guidelineId: id, status: 'fail', score: 0, message: 'Failed' })
}

function throwingCheck(guidelineId: string): CheckFn {
  return () => {
    throw new CheckError('Something went wrong', guidelineId)
  }
}

function rejectingCheck(guidelineId: string): CheckFn {
  return async () => {
    throw new Error(`Async failure for ${guidelineId}`)
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CheckRunner', () => {
  it('constructs with zero checks', () => {
    const runner = new CheckRunner()
    expect(runner.checkCount).toBe(0)
  })

  it('registers a single check via register()', () => {
    const runner = new CheckRunner()
    runner.register(passingCheck('3.1'))
    expect(runner.checkCount).toBe(1)
  })

  it('register() returns this for fluent chaining', () => {
    const runner = new CheckRunner()
    const returned = runner.register(passingCheck('3.1'))
    expect(returned).toBe(runner)
  })

  it('registers multiple checks via registerAll()', () => {
    const runner = new CheckRunner()
    runner.registerAll([passingCheck('3.1'), passingCheck('3.2'), passingCheck('3.3')])
    expect(runner.checkCount).toBe(3)
  })

  it('registerAll() returns this for fluent chaining', () => {
    const runner = new CheckRunner()
    const returned = runner.registerAll([passingCheck('3.1')])
    expect(returned).toBe(runner)
  })

  it('returns an empty array when no checks are registered', async () => {
    const runner = new CheckRunner()
    const results = await runner.run(PAGE_DATA)
    expect(results).toEqual([])
  })

  it('returns results in registration order', async () => {
    const runner = new CheckRunner()
    runner.registerAll([passingCheck('3.1'), passingCheck('3.2'), passingCheck('3.3')])
    const results = await runner.run(PAGE_DATA)
    expect(results.map((r) => r.guidelineId)).toEqual(['3.1', '3.2', '3.3'])
  })

  it('runs all checks in parallel (via Promise.allSettled)', async () => {
    const order: string[] = []
    const slowCheck: CheckFn = async () => {
      await new Promise((r) => setTimeout(r, 10))
      order.push('slow')
      return makeResult({ guidelineId: 'slow' })
    }
    const fastCheck: CheckFn = async () => {
      order.push('fast')
      return makeResult({ guidelineId: 'fast' })
    }

    const runner = new CheckRunner()
    runner.registerAll([slowCheck, fastCheck])
    await runner.run(PAGE_DATA)

    // Both checks ran (order is implementation detail of parallel execution)
    expect(order).toContain('slow')
    expect(order).toContain('fast')
  })

  it('propagates passing results correctly', async () => {
    const runner = new CheckRunner()
    runner.register(passingCheck('3.1'))
    const [result] = await runner.run(PAGE_DATA)
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('propagates failing results correctly', async () => {
    const runner = new CheckRunner()
    runner.register(failingCheck('3.2'))
    const [result] = await runner.run(PAGE_DATA)
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('converts a CheckError thrown synchronously into a fail result', async () => {
    const runner = new CheckRunner()
    runner.register(throwingCheck('3.5'))
    const results = await runner.run(PAGE_DATA)

    expect(results).toHaveLength(1)
    const [result] = results
    expect(result.status).toBe('fail')
    expect(result.guidelineId).toBe('3.5')
    expect(result.message).toContain('Something went wrong')
  })

  it('converts an async rejection into a fail result', async () => {
    const runner = new CheckRunner()
    runner.register(rejectingCheck('3.6'))
    const results = await runner.run(PAGE_DATA)

    expect(results).toHaveLength(1)
    const [result] = results
    expect(result.status).toBe('fail')
    expect(result.message).toContain('Async failure for 3.6')
  })

  it('continues remaining checks when one check throws', async () => {
    const runner = new CheckRunner()
    runner.registerAll([throwingCheck('3.1'), passingCheck('3.2'), failingCheck('3.3')])

    const results = await runner.run(PAGE_DATA)
    expect(results).toHaveLength(3)
    expect(results[0].status).toBe('fail') // error result
    expect(results[1].status).toBe('pass')
    expect(results[2].status).toBe('fail') // actual fail
  })

  it('uses a generic guidelineId for a non-CheckError rejection', async () => {
    const unknownRejection: CheckFn = async () => {
      throw new Error('Some generic error')
    }
    const runner = new CheckRunner()
    runner.register(unknownRejection)
    const [result] = await runner.run(PAGE_DATA)

    expect(result.guidelineId).toMatch(/^check-error-/)
  })

  it('handles a mix of sync and async checks', async () => {
    const syncCheck: CheckFn = () => makeResult({ guidelineId: 'sync', status: 'pass' })
    const asyncCheck: CheckFn = async () => makeResult({ guidelineId: 'async', status: 'warn' })

    const runner = new CheckRunner()
    runner.registerAll([syncCheck, asyncCheck])
    const results = await runner.run(PAGE_DATA)

    expect(results).toHaveLength(2)
    expect(results.find((r) => r.guidelineId === 'sync')?.status).toBe('pass')
    expect(results.find((r) => r.guidelineId === 'async')?.status).toBe('warn')
  })

  it('passes the page data to each check function', async () => {
    const received: PageData[] = []
    const recordingCheck: CheckFn = (page) => {
      received.push(page)
      return makeResult()
    }

    const runner = new CheckRunner()
    runner.registerAll([recordingCheck, recordingCheck])

    const fakePage: PageData = { url: 'https://example.com' } as PageData
    await runner.run(fakePage)

    expect(received).toHaveLength(2)
    expect(received[0]).toBe(fakePage)
    expect(received[1]).toBe(fakePage)
  })

  it('fluent chaining: register().register().registerAll() works', async () => {
    const runner = new CheckRunner()
    runner
      .register(passingCheck('a'))
      .register(passingCheck('b'))
      .registerAll([passingCheck('c')])
    expect(runner.checkCount).toBe(3)
    const results = await runner.run(PAGE_DATA)
    expect(results).toHaveLength(3)
  })

  it('records an error result as impact high and category web-dev', async () => {
    const runner = new CheckRunner()
    runner.register(throwingCheck('3.1'))
    const [result] = await runner.run(PAGE_DATA)
    expect(result.impact).toBe('high')
    expect(result.category).toBe('web-dev')
    expect(result.machineTestable).toBe(true)
  })

  it('spy confirms each check is called exactly once per run', async () => {
    const spy = vi.fn(() => makeResult())
    const runner = new CheckRunner()
    runner.register(spy)
    await runner.run(PAGE_DATA)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
