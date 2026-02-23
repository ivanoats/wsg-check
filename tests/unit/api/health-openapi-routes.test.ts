import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const enforceRateLimitMock = vi.fn()

vi.mock('@/api/rate-limit', () => ({ enforceRateLimit: enforceRateLimitMock }))

const { GET: healthGet, OPTIONS: healthOptions } = await import('@/app/api/health/route')
const { GET: openApiGet } = await import('@/app/api/openapi/route')

describe('health/openapi routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    enforceRateLimitMock.mockResolvedValue(null)
  })

  it('GET /api/health returns service status', async () => {
    const response = await healthGet({} as NextRequest)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.service).toBe('wsg-check-api')
  })

  it('OPTIONS /api/health returns CORS preflight response', async () => {
    const response = await healthOptions()

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
  })

  it('GET /api/openapi returns OpenAPI spec document', async () => {
    const response = await openApiGet({} as NextRequest)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.openapi).toBe('3.1.0')
    expect(body.paths['/api/check']).toBeDefined()
  })

  it('returns rate-limited response when limiter blocks request', async () => {
    enforceRateLimitMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'RATE_LIMITED' }), { status: 429 })
    )

    const response = await healthGet({} as NextRequest)

    expect(response.status).toBe(429)
  })
})
