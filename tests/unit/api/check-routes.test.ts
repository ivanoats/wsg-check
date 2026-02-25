import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const enforceRateLimitMock = vi.fn()
const validateCheckPayloadMock = vi.fn()
const validateTargetUrlMock = vi.fn()
const selectChecksMock = vi.fn()
const saveCheckResultMock = vi.fn()
const checkerCheckMock = vi.fn()
const fromRunResultMock = vi.fn()

vi.mock('@/api/rate-limit', () => ({ enforceRateLimit: enforceRateLimitMock }))
vi.mock('@/api/validation', () => ({
  validateCheckPayload: validateCheckPayloadMock,
  validateTargetUrl: validateTargetUrlMock,
}))
vi.mock('@/api/check-selection', () => ({ selectChecks: selectChecksMock }))
vi.mock('@/api/store', () => ({ saveCheckResult: saveCheckResultMock, findCheckResult: vi.fn() }))
vi.mock('@/core/index', () => ({
  WsgChecker: class {
    check = checkerCheckMock
  },
}))
vi.mock('@/report/index', () => ({ fromRunResult: fromRunResultMock }))

const { POST } = await import('@/app/api/check/route')
const { GET } = await import('@/app/api/check/[id]/route')
const { findCheckResult } = await import('@/api/store')

describe('check routes', () => {
  const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  beforeEach(() => {
    vi.clearAllMocks()
    enforceRateLimitMock.mockResolvedValue(null)
  })

  it('POST /api/check returns completed report payload', async () => {
    validateCheckPayloadMock.mockReturnValue({
      ok: true,
      value: { url: 'https://example.com', categories: ['ux'], guidelines: ['2.8'] },
    })
    validateTargetUrlMock.mockResolvedValue({ ok: true, value: new URL('https://example.com') })
    selectChecksMock.mockReturnValue([{ guidelineId: '2.8' }])
    checkerCheckMock.mockResolvedValue({ ok: true, value: { overallScore: 80 } })
    fromRunResultMock.mockReturnValue({ overallScore: 80, summary: { totalChecks: 1 } })

    const request = {
      json: async () => ({ url: 'https://example.com', categories: ['ux'] }),
    } as unknown as NextRequest

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('completed')
    expect(typeof body.id).toBe('string')
    expect(body.id).toMatch(uuidV4Pattern)
    expect(saveCheckResultMock).toHaveBeenCalledTimes(1)
  })

  it('POST /api/check returns 400 on invalid payload', async () => {
    validateCheckPayloadMock.mockReturnValue({ ok: false, error: new Error('bad payload') })

    const request = {
      json: async () => ({ bad: true }),
    } as unknown as NextRequest

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('BAD_REQUEST')
    expect(body.message).toContain('bad payload')
  })

  it('GET /api/check/:id returns 404 when result not found', async () => {
    vi.mocked(findCheckResult).mockReturnValue(undefined)

    const request = {} as NextRequest
    const response = await GET(request, { params: Promise.resolve({ id: 'missing' }) })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('NOT_FOUND')
  })

  it('GET /api/check/:id returns stored result when present', async () => {
    vi.mocked(findCheckResult).mockReturnValue({
      id: 'abc',
      status: 'completed',
      report: { overallScore: 90 },
    } as never)

    const request = {} as NextRequest
    const response = await GET(request, { params: Promise.resolve({ id: 'abc' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.id).toBe('abc')
    expect(body.status).toBe('completed')
  })
})
