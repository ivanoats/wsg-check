import { beforeEach, describe, expect, it, vi } from 'vitest'

interface RequestLike {
  readonly nextUrl: { readonly pathname: string }
  readonly headers: { readonly get: (name: string) => string | null }
  readonly ip?: string
}

const makeRequest = ({
  pathname,
  forwarded,
  realIp,
  ip,
}: {
  readonly pathname: string
  readonly forwarded?: string
  readonly realIp?: string
  readonly ip?: string
}): RequestLike => {
  const request: RequestLike = {
    nextUrl: { pathname },
    headers: {
      get: (name: string): string | null => {
        if (name === 'x-forwarded-for') {
          return forwarded ?? null
        }
        if (name === 'x-real-ip') {
          return realIp ?? null
        }
        return null
      },
    },
  }

  if (ip === undefined) {
    return request
  }

  return {
    ...request,
    ip,
  }
}

describe('api/rate-limit', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.WSG_API_RATE_LIMIT_POINTS = '1'
    process.env.WSG_API_RATE_LIMIT_DURATION_SECONDS = '60'
  })

  it('ignores forwarded headers when trust proxy is disabled', async () => {
    process.env.WSG_API_TRUST_PROXY = 'false'
    const { enforceRateLimit } = await import('@/api/rate-limit')

    const first = await enforceRateLimit(
      makeRequest({ pathname: '/api/check', forwarded: '1.1.1.1' }) as never
    )
    const second = await enforceRateLimit(
      makeRequest({ pathname: '/api/check', forwarded: '2.2.2.2' }) as never
    )

    expect(first).toBeNull()
    expect(second?.status).toBe(429)
  })

  it('uses x-forwarded-for when trust proxy is enabled', async () => {
    process.env.WSG_API_TRUST_PROXY = 'true'
    const { enforceRateLimit } = await import('@/api/rate-limit')

    const first = await enforceRateLimit(
      makeRequest({ pathname: '/api/check', forwarded: '1.1.1.1, 9.9.9.9' }) as never
    )
    const second = await enforceRateLimit(
      makeRequest({ pathname: '/api/check', forwarded: '2.2.2.2' }) as never
    )

    expect(first).toBeNull()
    expect(second).toBeNull()
  })

  it('falls back to x-real-ip when forwarded header is not present', async () => {
    process.env.WSG_API_TRUST_PROXY = 'true'
    const { enforceRateLimit } = await import('@/api/rate-limit')

    const first = await enforceRateLimit(
      makeRequest({ pathname: '/api/guidelines', realIp: '3.3.3.3' }) as never
    )
    const second = await enforceRateLimit(
      makeRequest({ pathname: '/api/guidelines', realIp: '3.3.3.3' }) as never
    )

    expect(first).toBeNull()
    expect(second?.status).toBe(429)
  })

  it('prefers platform ip over forwarded headers and returns retry metadata', async () => {
    process.env.WSG_API_TRUST_PROXY = 'true'
    const { enforceRateLimit } = await import('@/api/rate-limit')

    const first = await enforceRateLimit(
      makeRequest({ pathname: '/api/openapi', ip: '4.4.4.4', forwarded: '7.7.7.7' }) as never
    )
    const second = await enforceRateLimit(
      makeRequest({ pathname: '/api/openapi', ip: '4.4.4.4', forwarded: '8.8.8.8' }) as never
    )

    expect(first).toBeNull()
    expect(second?.status).toBe(429)

    const body = await second?.json()
    expect(body.error).toBe('RATE_LIMITED')
    const retryAfter = second?.headers.get('Retry-After')
    expect(retryAfter).toBeDefined()
    expect(parseInt(retryAfter ?? '0', 10)).toBeGreaterThanOrEqual(1)
  })

  it('falls back to x-real-ip when x-forwarded-for first entry is empty', async () => {
    process.env.WSG_API_TRUST_PROXY = 'true'
    const { enforceRateLimit } = await import('@/api/rate-limit')

    const first = await enforceRateLimit(
      makeRequest({ pathname: '/api/check', forwarded: ', 10.0.0.1', realIp: '5.5.5.5' }) as never
    )
    const second = await enforceRateLimit(
      makeRequest({ pathname: '/api/check', forwarded: ', 9.9.9.9', realIp: '5.5.5.5' }) as never
    )

    expect(first).toBeNull()
    expect(second?.status).toBe(429)
  })

  it('falls back to x-real-ip when x-forwarded-for is only whitespace', async () => {
    process.env.WSG_API_TRUST_PROXY = 'true'
    const { enforceRateLimit } = await import('@/api/rate-limit')

    const first = await enforceRateLimit(
      makeRequest({ pathname: '/api/health', forwarded: '   ', realIp: '6.6.6.6' }) as never
    )
    const second = await enforceRateLimit(
      makeRequest({ pathname: '/api/health', forwarded: '   ', realIp: '6.6.6.6' }) as never
    )

    expect(first).toBeNull()
    expect(second?.status).toBe(429)
  })
})
