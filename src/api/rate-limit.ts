/**
 * In-memory rate limiter for Next.js Route Handlers.
 *
 * Uses `rate-limiter-flexible` with an in-memory backend.  Each client IP is
 * allowed {@link RATE_LIMIT_POINTS} requests per {@link RATE_LIMIT_DURATION}
 * second window.  Both values are overridable via environment variables
 * (see `.env.example`).
 *
 * Client IP resolution respects the `WSG_API_TRUST_PROXY` flag to prevent
 * header-spoofing bypasses — see {@link getClientIp} for the full trust chain.
 */
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
 * Trust chain (in order of preference):
 * 1. `request.ip` – platform-provided IP (Vercel/Next.js runtime; cannot be
 *    spoofed by the client).
 * 2. `x-forwarded-for` / `x-real-ip` – only trusted when the
 *    `WSG_API_TRUST_PROXY=true` environment variable is set, indicating that
 *    the deployment is behind a trusted reverse-proxy that controls these
 *    headers.  Without this flag, forwarded headers are ignored because they
 *    can be trivially forged to bypass rate limiting.
 *
 * Falls back to "anonymous" only when no trusted IP information is present.
 */
const TRUST_PROXY = process.env.WSG_API_TRUST_PROXY === 'true'

const getClientIp = (request: NextRequest): string => {
  // request.ip is available on Vercel/edge runtime but is absent from the
  // NextRequest TypeScript types in newer Next.js versions; access via cast.
  const platformIp = (request as unknown as { readonly ip?: string }).ip
  if (typeof platformIp === 'string' && platformIp.trim().length > 0) {
    return platformIp.trim()
  }

  if (TRUST_PROXY) {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded && forwarded.trim().length > 0) {
      const firstForwarded = forwarded.split(',')[0]?.trim()
      if (firstForwarded) {
        return firstForwarded
      }
    }

    const realIp = request.headers.get('x-real-ip')
    if (realIp && realIp.trim().length > 0) {
      return realIp.trim()
    }
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
