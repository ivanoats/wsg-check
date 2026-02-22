import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const enforceRateLimitMock = vi.fn()
const loadGuidelinesMock = vi.fn()
const findGuidelineByIdMock = vi.fn()

vi.mock('@/api/rate-limit', () => ({ enforceRateLimit: enforceRateLimitMock }))
vi.mock('@/api/guidelines', () => ({
  loadGuidelines: loadGuidelinesMock,
  findGuidelineById: findGuidelineByIdMock,
}))

const { GET: listGuidelines } = await import('@/app/api/guidelines/route')
const { GET: getGuideline } = await import('@/app/api/guidelines/[id]/route')

describe('guidelines routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    enforceRateLimitMock.mockResolvedValue(null)
  })

  it('GET /api/guidelines returns list and source', async () => {
    loadGuidelinesMock.mockResolvedValue({
      source: 'w3c-api',
      guidelines: [{ id: '3.1' }],
    })

    const response = await listGuidelines({} as NextRequest)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.source).toBe('w3c-api')
    expect(body.guidelines).toHaveLength(1)
  })

  it('GET /api/guidelines/:id returns 404 when missing', async () => {
    findGuidelineByIdMock.mockResolvedValue({ source: 'static-fallback' })

    const response = await getGuideline({} as NextRequest, {
      params: Promise.resolve({ id: '9.9' }),
    })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('NOT_FOUND')
  })

  it('GET /api/guidelines/:id returns guideline details when found', async () => {
    findGuidelineByIdMock.mockResolvedValue({
      source: 'static-fallback',
      guideline: { id: '3.1', title: 'Guideline' },
    })

    const response = await getGuideline({} as NextRequest, {
      params: Promise.resolve({ id: '3.1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.guideline.id).toBe('3.1')
    expect(body.source).toBe('static-fallback')
  })
})
