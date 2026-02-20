import { describe, it, expect } from 'vitest'
import { FetchError, ParseError, ConfigError, CheckError } from '@/utils/errors'

describe('FetchError', () => {
  it('has the correct name', () => {
    const err = new FetchError('network error', 'https://example.com')
    expect(err.name).toBe('FetchError')
  })

  it('stores the url', () => {
    const err = new FetchError('timed out', 'https://example.com/page')
    expect(err.url).toBe('https://example.com/page')
  })

  it('stores a cause when provided', () => {
    const cause = new Error('ECONNREFUSED')
    const err = new FetchError('connection refused', 'https://example.com', cause)
    expect(err.cause).toBe(cause)
  })

  it('is an instance of Error', () => {
    const err = new FetchError('oops', 'https://x.com')
    expect(err).toBeInstanceOf(Error)
  })

  it('has no cause when not provided', () => {
    const err = new FetchError('msg', 'https://x.com')
    expect(err.cause).toBeUndefined()
  })
})

describe('ParseError', () => {
  it('has the correct name', () => {
    const err = new ParseError('bad html')
    expect(err.name).toBe('ParseError')
  })

  it('stores a cause when provided', () => {
    const cause = new SyntaxError('unexpected token')
    const err = new ParseError('invalid JSON-LD', cause)
    expect(err.cause).toBe(cause)
  })

  it('is an instance of Error', () => {
    expect(new ParseError('x')).toBeInstanceOf(Error)
  })
})

describe('ConfigError', () => {
  it('has the correct name', () => {
    const err = new ConfigError('invalid timeout')
    expect(err.name).toBe('ConfigError')
  })

  it('stores the field when provided', () => {
    const err = new ConfigError('must be positive', 'timeout')
    expect(err.field).toBe('timeout')
  })

  it('field is undefined when not provided', () => {
    const err = new ConfigError('bad config')
    expect(err.field).toBeUndefined()
  })

  it('is an instance of Error', () => {
    expect(new ConfigError('x')).toBeInstanceOf(Error)
  })
})

describe('CheckError', () => {
  it('has the correct name', () => {
    const err = new CheckError('check failed', '3.2')
    expect(err.name).toBe('CheckError')
  })

  it('stores the guidelineId', () => {
    const err = new CheckError('failed', '4.6')
    expect(err.guidelineId).toBe('4.6')
  })

  it('stores a cause when provided', () => {
    const cause = new TypeError('not a function')
    const err = new CheckError('runtime error', '3.1', cause)
    expect(err.cause).toBe(cause)
  })

  it('is an instance of Error', () => {
    expect(new CheckError('x', '1.1')).toBeInstanceOf(Error)
  })
})
