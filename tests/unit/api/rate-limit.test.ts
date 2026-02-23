import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'

const consumeMock = vi.hoisted(() => vi.fn())

vi.mock('rate-limiter-flexible', () => {
  class MockRateLimiterRes extends Error {
    readonly msBeforeNext: number
    constructor(msBeforeNext: number) {
      super('Rate limit exceeded')
      this.msBeforeNext = msBeforeNext
    }
  }
  return {
    RateLimiterMemory: class {
      consume = consumeMock
    },
    RateLimiterRes: MockRateLimiterRes,
  }
})

const { enforceRateLimit } = await import('@/api/rate-limit')

const makeRequest = (options: {
  pathname?: string
  ip?: string
  headers?: Record<string, string>
}): NextRequest => {
  const headers = new Headers(options.headers ?? {})
  const req = {
    nextUrl: { pathname: options.pathname ?? '/api/check' },
    headers: { get: (name: string) => headers.get(name) },
  } as unknown as NextRequest
  if (options.ip !== undefined) {
    ;(req as unknown as { ip: string }).ip = options.ip
  }
  return req
}

describe('enforceRateLimit', () => {
  beforeEach(() => {
    consumeMock.mockReset()
  })

  it('returns null when the rate limit is not exceeded', async () => {
    consumeMock.mockResolvedValue({})
    const result = await enforceRateLimit(makeRequest({}))
    expect(result).toBeNull()
  })

  it('returns 429 with Retry-After when RateLimiterRes is thrown', async () => {
    const { RateLimiterRes } = await import('rate-limiter-flexible')
    consumeMock.mockRejectedValue(new RateLimiterRes(5000))

    const result = await enforceRateLimit(makeRequest({}))

    expect(result).not.toBeNull()
    expect(result!.status).toBe(429)
    expect(result!.headers.get('Retry-After')).toBe('5')
    const body = await result!.json()
    expect(body.error).toBe('RATE_LIMITED')
  })

  it('returns 429 with fallback duration on a generic error', async () => {
    consumeMock.mockRejectedValue(new Error('Unexpected'))

    const result = await enforceRateLimit(makeRequest({}))

    expect(result).not.toBeNull()
    expect(result!.status).toBe(429)
    const body = await result!.json()
    expect(body.error).toBe('RATE_LIMITED')
  })

  it('uses platform IP (request.ip) in the rate-limit key', async () => {
    consumeMock.mockResolvedValue({})
    await enforceRateLimit(makeRequest({ ip: '1.2.3.4', pathname: '/api/test' }))
    expect(consumeMock).toHaveBeenCalledWith('/api/test:1.2.3.4', 1)
  })

  it('falls back to "anonymous" when no IP information is available', async () => {
    consumeMock.mockResolvedValue({})
    await enforceRateLimit(makeRequest({ pathname: '/api/test' }))
    expect(consumeMock).toHaveBeenCalledWith('/api/test:anonymous', 1)
  })

  it('ignores x-forwarded-for when TRUST_PROXY is not set', async () => {
    consumeMock.mockResolvedValue({})
    await enforceRateLimit(
      makeRequest({ pathname: '/api/test', headers: { 'x-forwarded-for': '9.9.9.9' } })
    )
    expect(consumeMock).toHaveBeenCalledWith('/api/test:anonymous', 1)
  })
})

describe('enforceRateLimit with WSG_API_TRUST_PROXY=true', () => {
  let enforceRateLimitTrusted: typeof enforceRateLimit

  beforeEach(async () => {
    consumeMock.mockReset()
    vi.resetModules()
    process.env.WSG_API_TRUST_PROXY = 'true'
    const module = await import('@/api/rate-limit')
    enforceRateLimitTrusted = module.enforceRateLimit
  })

  afterEach(() => {
    delete process.env.WSG_API_TRUST_PROXY
  })

  it('uses the first x-forwarded-for entry', async () => {
    consumeMock.mockResolvedValue({})
    await enforceRateLimitTrusted(
      makeRequest({
        pathname: '/api/test',
        headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' },
      })
    )
    expect(consumeMock).toHaveBeenCalledWith('/api/test:9.9.9.9', 1)
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
    consumeMock.mockResolvedValue({})
    await enforceRateLimitTrusted(
      makeRequest({ pathname: '/api/test', headers: { 'x-real-ip': '7.7.7.7' } })
    )
    expect(consumeMock).toHaveBeenCalledWith('/api/test:7.7.7.7', 1)
  })

  it('platform IP takes precedence over forwarded headers', async () => {
    consumeMock.mockResolvedValue({})
    await enforceRateLimitTrusted(
      makeRequest({
        ip: '1.2.3.4',
        pathname: '/api/test',
        headers: { 'x-forwarded-for': '9.9.9.9' },
      })
    )
    expect(consumeMock).toHaveBeenCalledWith('/api/test:1.2.3.4', 1)
  })

  it('falls back to "anonymous" when no forwarded headers are present', async () => {
    consumeMock.mockResolvedValue({})
    await enforceRateLimitTrusted(makeRequest({ pathname: '/api/test' }))
    expect(consumeMock).toHaveBeenCalledWith('/api/test:anonymous', 1)
  })
})
