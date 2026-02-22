/**
 * CLI Module — Unit Tests (Phase 7)
 *
 * Tests for `buildProgram` (option parsing) and `runCheck` (core logic).
 * Network calls are mocked so that tests run offline and fast.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildProgram, runCheck } from '@/cli/index'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/core/index', () => {
  const mockCheck = vi.fn()
  function WsgChecker() {
    return { check: mockCheck }
  }
  return { WsgChecker, _mockCheck: mockCheck }
})

// Helper to retrieve the mocked `check` function from the WsgChecker mock.
const getMockCheck = async () => {
  const mod = await import('@/core/index')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mod as any)._mockCheck as ReturnType<typeof vi.fn>
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PASSING_RUN_RESULT = {
  url: 'https://example.com',
  timestamp: '2024-01-01T00:00:00.000Z',
  duration: 500,
  overallScore: 85,
  categoryScores: [],
  results: [],
  co2PerPageView: 0.001,
  co2Model: 'swd-v4' as const,
  isGreenHosted: false,
}

const LOW_SCORE_RUN_RESULT = {
  ...PASSING_RUN_RESULT,
  overallScore: 30,
}

// ─── buildProgram ─────────────────────────────────────────────────────────────

describe('buildProgram', () => {
  it('creates a command named wsg-check', () => {
    const program = buildProgram()
    expect(program.name()).toBe('wsg-check')
  })

  it('has the expected top-level options', () => {
    const program = buildProgram()
    const optionNames = program.options.map((o) => o.long)
    expect(optionNames).toContain('--format')
    expect(optionNames).toContain('--output')
    expect(optionNames).toContain('--categories')
    expect(optionNames).toContain('--guidelines')
    expect(optionNames).toContain('--fail-threshold')
    expect(optionNames).toContain('--verbose')
    expect(optionNames).toContain('--config')
  })

  it('accepts a <url> positional argument', () => {
    const program = buildProgram()
    const args = program.registeredArguments
    expect(args.length).toBeGreaterThanOrEqual(1)
    expect(args[0].name()).toBe('url')
  })
})

// ─── runCheck ─────────────────────────────────────────────────────────────────

describe('runCheck', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    // Reset the mock before each test
    const mockCheck = await getMockCheck()
    mockCheck.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns exit code 0 when the check succeeds and score meets threshold', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: PASSING_RUN_RESULT })

    const code = await runCheck('https://example.com', {})
    expect(code).toBe(0)
  })

  it('returns exit code 1 when the checker returns an error', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({
      ok: false,
      error: new Error('Network failure'),
    })

    const code = await runCheck('https://example.com', {})
    expect(code).toBe(1)
  })

  it('returns exit code 1 when score is below fail-threshold', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: LOW_SCORE_RUN_RESULT })

    const code = await runCheck('https://example.com', { failThreshold: '70' })
    expect(code).toBe(1)
  })

  it('returns exit code 0 when score equals fail-threshold', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: { ...PASSING_RUN_RESULT, overallScore: 70 } })

    const code = await runCheck('https://example.com', { failThreshold: '70' })
    expect(code).toBe(0)
  })

  it('writes output to stdout when no --output path is provided', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: PASSING_RUN_RESULT })

    await runCheck('https://example.com', { format: 'json' })
    const writtenArgs = stdoutSpy.mock.calls.map((c: unknown[]) => c[0]).join('')
    expect(writtenArgs).toContain('overallScore')
  })

  it('writes an error message to stderr on fetch failure', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: false, error: new Error('Timeout') })

    await runCheck('https://example.com', {})
    const stderrOutput = stderrSpy.mock.calls.map((c: unknown[]) => c[0]).join('')
    expect(stderrOutput).toContain('Timeout')
  })

  it('respects the --categories option', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: PASSING_RUN_RESULT })

    const code = await runCheck('https://example.com', { categories: 'web-dev' })
    expect(code).toBe(0)
  })

  it('respects the --guidelines option', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: PASSING_RUN_RESULT })

    const code = await runCheck('https://example.com', { guidelines: '3.1,3.2' })
    expect(code).toBe(0)
  })

  it('outputs markdown format when --format markdown is specified', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: PASSING_RUN_RESULT })

    await runCheck('https://example.com', { format: 'markdown' })
    const writtenArgs = stdoutSpy.mock.calls.map((c: unknown[]) => c[0]).join('')
    expect(writtenArgs).toContain('# WSG Sustainability Report')
  })

  it('outputs html format when --format html is specified', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: PASSING_RUN_RESULT })

    await runCheck('https://example.com', { format: 'html' })
    const writtenArgs = stdoutSpy.mock.calls.map((c: unknown[]) => c[0]).join('')
    expect(writtenArgs).toContain('<!DOCTYPE html>')
  })
})
