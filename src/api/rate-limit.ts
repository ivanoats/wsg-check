import type { NextRequest } from 'next/server'
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible'
import { errorJson } from './response'

const RATE_LIMIT_POINTS = Number.parseInt(process.env.WSG_API_RATE_LIMIT_POINTS ?? '30', 10)
const RATE_LIMIT_DURATION = Number.parseInt(
  process.env.WSG_API_RATE_LIMIT_DURATION_SECONDS ?? '60',
  10
)

const limiter = new RateLimiterMemory({
  points: Number.isNaN(RATE_LIMIT_POINTS) ? 30 : RATE_LIMIT_POINTS,
  duration: Number.isNaN(RATE_LIMIT_DURATION) ? 60 : RATE_LIMIT_DURATION,
})

/**
 * Derive a stable client identifier for rate limiting.
 *
 * Trusted sources, in order of preference:
 * - `x-forwarded-for` (left-most IP, set by upstream proxies)
 * - `x-real-ip` (single IP, set by some reverse proxies)
 *
 * Falls back to "anonymous" only when no trusted IP information is present.
 */
const getClientIp = (request: NextRequest): string => {
  const headers = request.headers

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded && forwarded.trim().length > 0) {
    const firstForwarded = forwarded.split(',')[0]?.trim()
    if (firstForwarded) {
      return firstForwarded
    }
  }

  const realIp = headers.get('x-real-ip')
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim()
  }

  return 'anonymous'
}

export const enforceRateLimit = async (request: NextRequest): Promise<Response | null> => {
  const key = `${request.nextUrl.pathname}:${getClientIp(request)}`
  try {
    await limiter.consume(key, 1)
    return null
  } catch (error_) {
    const remainingSeconds =
      error_ instanceof RateLimiterRes ? Math.ceil(error_.msBeforeNext / 1000) : RATE_LIMIT_DURATION

    const response = errorJson(429, 'RATE_LIMITED', 'Rate limit exceeded. Please retry later.', {
      retryAfterSeconds: remainingSeconds,
    })
    response.headers.set('Retry-After', String(remainingSeconds))
    return response
  }
}
