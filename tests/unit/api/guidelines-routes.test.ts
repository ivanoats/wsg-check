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

  it('GET /api/guidelines returns list and spec release', async () => {
    loadGuidelinesMock.mockReturnValue({
      spec: { release: 'July-2026' },
      guidelines: [{ id: 'use-sustainable-hosting' }],
    })

    const response = await listGuidelines({} as NextRequest)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.spec.release).toBe('July-2026')
    expect(body.guidelines).toHaveLength(1)
  })

  it('GET /api/guidelines/:id returns 404 when missing', async () => {
    findGuidelineByIdMock.mockReturnValue({ spec: { release: 'July-2026' } })

    const response = await getGuideline({} as NextRequest, {
      params: Promise.resolve({ id: '9.9' }),
    })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('NOT_FOUND')
  })

  it('GET /api/guidelines/:id returns guideline details when found', async () => {
    findGuidelineByIdMock.mockReturnValue({
      spec: { release: 'July-2026' },
      guideline: { id: 'use-sustainable-hosting', title: 'Guideline' },
    })

    const response = await getGuideline({} as NextRequest, {
      params: Promise.resolve({ id: 'use-sustainable-hosting' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(findGuidelineByIdMock).toHaveBeenCalledWith('use-sustainable-hosting')
    expect(body.guideline.id).toBe('use-sustainable-hosting')
    expect(body.spec.release).toBe('July-2026')
  })
})
