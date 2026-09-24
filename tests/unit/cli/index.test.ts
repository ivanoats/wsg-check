/**
 * CLI Module — Unit Tests (Phase 7)
 *
 * Tests for `buildProgram` (option parsing) and `runCheck` (core logic).
 * Network calls are mocked so that tests run offline and fast.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildProgram, isEntryPoint, runCheck } from '@/cli/index'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/core/index', () => {
  const mockCheck = vi.fn()
  // Track the checks array passed to the constructor so tests can inspect filtering.
  let lastChecks: unknown[] = []
  function WsgChecker(_config: unknown, checks: unknown[]) {
    lastChecks = checks
    return { check: mockCheck }
  }
  return { WsgChecker, _mockCheck: mockCheck, _getLastChecks: () => lastChecks }
})

// Helper to retrieve the mocked `check` function from the WsgChecker mock.
const getMockCheck = async () => {
  const mod = await import('@/core/index')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mod as any)._mockCheck as ReturnType<typeof vi.fn>
}

// Helper to retrieve the checks that were passed to the last WsgChecker construction.
const getLastChecks = async (): Promise<Array<{ guidelineId?: string }>> => {
  const mod = await import('@/core/index')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mod as any)._getLastChecks()
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

describe('isEntryPoint', () => {
  let dir: string
  let script: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'wsg-entry-'))
    script = join(dir, 'index.js')
    writeFileSync(script, '')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('matches when argv[1] is the module file itself', () => {
    expect(isEntryPoint(pathToFileURL(script).href, script)).toBe(true)
  })

  it('matches when argv[1] is a symlink to the module, as npm installs bins', () => {
    const link = join(dir, 'wsg-check')
    symlinkSync(script, link)
    expect(isEntryPoint(pathToFileURL(script).href, link)).toBe(true)
  })

  it('does not match a different file', () => {
    const other = join(dir, 'other.js')
    writeFileSync(other, '')
    expect(isEntryPoint(pathToFileURL(script).href, other)).toBe(false)
  })

  it('does not match when there is no script path (node --eval)', () => {
    expect(isEntryPoint(pathToFileURL(script).href, undefined)).toBe(false)
  })

  it('does not match when the script path does not exist', () => {
    expect(isEntryPoint(pathToFileURL(script).href, join(dir, 'missing.js'))).toBe(false)
  })
})

describe('buildProgram', () => {
  it('creates a command named wsg-check', () => {
    const program = buildProgram()
    expect(program.name()).toBe('wsg-check')
  })

  it('reports the package version and the targeted WSG release', () => {
    expect(buildProgram().version()).toMatch(/^\d+\.\d+\.\d+.* \(WSG July-2026\)$/)
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

  it('filters checks to only those matching --guidelines', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: PASSING_RUN_RESULT })

    const code = await runCheck('https://example.com', { guidelines: '3.1' })

    expect(code).toBe(0)
    const checks = await getLastChecks()
    expect(checks.length).toBeGreaterThan(0)
    expect(checks.every((c) => c.guidelineId === '3.1')).toBe(true)
  })

  it('filters checks by guideline slug, including checks with legacy IDs', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: PASSING_RUN_RESULT })

    const code = await runCheck('https://example.com', {
      guidelines: 'structure-metadata-for-machine-readability',
    })

    expect(code).toBe(0)
    const ids = new Set((await getLastChecks()).map((c) => c.guidelineId))
    // Legacy 3.4 (metadata) and 3.11 (structured data) both map to this slug.
    expect(ids).toEqual(new Set(['3.4', '3.11']))
    const stderrOutput = stderrSpy.mock.calls.map((c: unknown[]) => c[0]).join('')
    expect(stderrOutput).not.toContain('deprecated')
  })

  it('warns when --guidelines uses deprecated numeric IDs', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: PASSING_RUN_RESULT })

    await runCheck('https://example.com', { guidelines: '3.3,3.15' })

    const stderrOutput = stderrSpy.mock.calls.map((c: unknown[]) => c[0]).join('')
    expect(stderrOutput).toContain(
      'numeric guideline ID "3.3" is deprecated; use "minify-and-remove-unused-code" (WSG July-2026)'
    )
    expect(stderrOutput).toContain(
      'numeric guideline ID "3.15" is deprecated; use "security-headers" (related check, not scored)'
    )
  })

  it('warns that legacy 2.17 also runs a related check, naming both replacements', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: PASSING_RUN_RESULT })

    await runCheck('https://example.com', { guidelines: '2.17' })

    const stderrOutput = stderrSpy.mock.calls.map((c: unknown[]) => c[0]).join('')
    expect(stderrOutput).toContain(
      'numeric guideline ID "2.17" is deprecated; use "reduce-the-impact-of-downloadable-and-physical-documents" (WSG July-2026); use "image-alt-text" (related check, not scored)'
    )
    expect(await getLastChecks()).toHaveLength(2)
  })

  it('writes report to a file when --output is specified', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: PASSING_RUN_RESULT })
    const tmpFile = join(tmpdir(), 'wsg-test-report.json')

    const code = await runCheck('https://example.com', { format: 'json', output: tmpFile })

    expect(code).toBe(0)
    expect(existsSync(tmpFile)).toBe(true)
    expect(readFileSync(tmpFile, 'utf8')).toContain('overallScore')
    unlinkSync(tmpFile)
    const stderrOutput = stderrSpy.mock.calls.map((c: unknown[]) => c[0]).join('')
    expect(stderrOutput).toContain(tmpFile)
  })

  it('returns exit code 1 and writes error to stderr when file write fails', async () => {
    const mockCheck = await getMockCheck()
    mockCheck.mockResolvedValue({ ok: true, value: PASSING_RUN_RESULT })

    // Writing to a non-existent nested path triggers a real ENOENT error.
    const badPath = join(tmpdir(), 'nonexistent-dir-wsg', 'report.json')
    const code = await runCheck('https://example.com', { format: 'json', output: badPath })

    expect(code).toBe(1)
    const stderrOutput = stderrSpy.mock.calls.map((c: unknown[]) => c[0]).join('')
    expect(stderrOutput).toContain(badPath)
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
