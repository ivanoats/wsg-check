import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger, defaultLogger } from '@/utils/logger'

describe('createLogger – terminal mode (default)', () => {
  let spy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    spy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    spy.mockRestore()
  })

  it('emits info messages', () => {
    const log = createLogger({ level: 'info' })
    log.info('hello world')
    expect(spy).toHaveBeenCalledWith('[INFO] hello world')
  })

  it('emits warn messages', () => {
    const log = createLogger({ level: 'info' })
    log.warn('something wrong')
    expect(spy).toHaveBeenCalledWith('[WARN] something wrong')
  })

  it('emits error messages', () => {
    const log = createLogger({ level: 'info' })
    log.error('critical issue')
    expect(spy).toHaveBeenCalledWith('[ERROR] critical issue')
  })

  it('includes extra data when provided', () => {
    const log = createLogger({ level: 'info' })
    log.info('fetching', { url: 'https://example.com' })
    expect(spy).toHaveBeenCalledWith('[INFO] fetching', { url: 'https://example.com' })
  })

  it('suppresses messages below the configured level', () => {
    const log = createLogger({ level: 'warn' })
    log.debug('verbose output')
    log.info('normal info')
    expect(spy).not.toHaveBeenCalled()
  })

  it('emits debug messages when level is debug', () => {
    const log = createLogger({ level: 'debug' })
    log.debug('debug detail')
    expect(spy).toHaveBeenCalledWith('[DEBUG] debug detail')
  })
})

describe('createLogger – structured mode', () => {
  let spy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    spy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    spy.mockRestore()
  })

  it('outputs valid JSON', () => {
    const log = createLogger({ level: 'info', structured: true })
    log.info('structured message')
    const raw = spy.mock.calls[0][0] as string
    expect(() => JSON.parse(raw)).not.toThrow()
  })

  it('includes level, message, and timestamp in JSON output', () => {
    const log = createLogger({ level: 'info', structured: true })
    log.info('hello')
    const entry = JSON.parse(spy.mock.calls[0][0] as string) as Record<string, unknown>
    expect(entry.level).toBe('info')
    expect(entry.message).toBe('hello')
    expect(typeof entry.timestamp).toBe('string')
  })

  it('includes data field when extra data is provided', () => {
    const log = createLogger({ level: 'info', structured: true })
    log.warn('check failed', { guidelineId: '3.2' })
    const entry = JSON.parse(spy.mock.calls[0][0] as string) as Record<string, unknown>
    expect(entry.data).toEqual({ guidelineId: '3.2' })
  })

  it('omits data field when no extra data is provided', () => {
    const log = createLogger({ level: 'info', structured: true })
    log.info('no data')
    const entry = JSON.parse(spy.mock.calls[0][0] as string) as Record<string, unknown>
    expect('data' in entry).toBe(false)
  })

  it('suppresses messages below the configured level', () => {
    const log = createLogger({ level: 'error', structured: true })
    log.info('ignored')
    log.warn('also ignored')
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('defaultLogger', () => {
  it('is exported and usable', () => {
    expect(defaultLogger).toBeDefined()
    expect(typeof defaultLogger.info).toBe('function')
  })
})
