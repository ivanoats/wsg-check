import type { NextRequest } from 'next/server'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { errorJson } from './response.js'

const RATE_LIMIT_POINTS = Number.parseInt(process.env.WSG_API_RATE_LIMIT_POINTS ?? '30', 10)
const RATE_LIMIT_DURATION = Number.parseInt(
  process.env.WSG_API_RATE_LIMIT_DURATION_SECONDS ?? '60',
  10
)

const limiter = new RateLimiterMemory({
  points: Number.isNaN(RATE_LIMIT_POINTS) ? 30 : RATE_LIMIT_POINTS,
  duration: Number.isNaN(RATE_LIMIT_DURATION) ? 60 : RATE_LIMIT_DURATION,
})

const getClientIp = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? 'anonymous'
}

export const enforceRateLimit = async (request: NextRequest): Promise<Response | null> => {
  const key = `${request.nextUrl.pathname}:${getClientIp(request)}`
  try {
    await limiter.consume(key, 1)
    return null
  } catch (error_) {
    const remainingSeconds =
      typeof error_ === 'object' &&
      error_ !== null &&
      'msBeforeNext' in error_ &&
      typeof (error_ as { msBeforeNext: unknown }).msBeforeNext === 'number'
        ? Math.ceil((error_ as { msBeforeNext: number }).msBeforeNext / 1000)
        : RATE_LIMIT_DURATION

    const response = errorJson(429, 'RATE_LIMITED', 'Rate limit exceeded. Please retry later.', {
      retryAfterSeconds: remainingSeconds,
    })
    response.headers.set('Retry-After', String(remainingSeconds))
    return response
  }
}
