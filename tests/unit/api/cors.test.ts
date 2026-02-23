import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

describe('api/cors', () => {
  const originalCorsOrigin = process.env.WSG_API_CORS_ORIGIN

  beforeEach(() => {
    vi.resetModules()

    if (originalCorsOrigin === undefined) {
      delete process.env.WSG_API_CORS_ORIGIN
      return
    }

    process.env.WSG_API_CORS_ORIGIN = originalCorsOrigin
  })

  it('does not set Vary when allow-origin is wildcard', async () => {
    delete process.env.WSG_API_CORS_ORIGIN

    const { withCors } = await import('@/api/cors')
    const response = withCors(new NextResponse(null, { status: 200 }))

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Vary')).toBeNull()
  })

  it('sets Vary to Origin when allow-origin is explicit', async () => {
    process.env.WSG_API_CORS_ORIGIN = 'https://example.com'

    const { withCors } = await import('@/api/cors')
    const response = withCors(new NextResponse(null, { status: 200 }))

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it('returns a 204 preflight response with CORS headers', async () => {
    process.env.WSG_API_CORS_ORIGIN = 'https://example.com'

    const { optionsResponse } = await import('@/api/cors')
    const response = optionsResponse()

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS')
    expect(response.headers.get('Vary')).toBe('Origin')
  })
})
