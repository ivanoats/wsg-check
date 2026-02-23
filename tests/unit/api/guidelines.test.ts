import { describe, it, expect, vi } from 'vitest'

const fetchWsgGuidelinesMock = vi.fn()
const mapApiToGuidelineEntriesMock = vi.fn()
const getGuidelineByIdMock = vi.fn()

vi.mock('@/config/index', () => ({
  fetchWsgGuidelines: fetchWsgGuidelinesMock,
  mapApiToGuidelineEntries: mapApiToGuidelineEntriesMock,
  TESTABILITY_OVERLAY: new Map(),
  GUIDELINES_REGISTRY: [
    {
      id: '3.1',
      title: 'Fallback Guideline',
      section: 'Web Development',
      category: 'web-dev',
      testability: 'manual-only',
      description: 'Fallback description',
    },
  ],
  getGuidelineById: getGuidelineByIdMock,
}))

const { loadGuidelines, findGuidelineById } = await import('@/api/guidelines')

describe('loadGuidelines', () => {
  it('returns W3C API mapped data when API fetch succeeds', async () => {
    fetchWsgGuidelinesMock.mockResolvedValueOnce({ ok: true, value: { category: [] } })
    mapApiToGuidelineEntriesMock.mockReturnValueOnce([
      {
        id: '2.1',
        title: 'API Guideline',
        section: 'UX',
        category: 'ux',
        testability: 'manual-only',
        description: 'From API',
      },
    ])

    const result = await loadGuidelines()

    expect(result.source).toBe('w3c-api')
    expect(result.guidelines).toHaveLength(1)
    expect(result.guidelines[0].id).toBe('2.1')
  })

  it('falls back to static registry when API fetch fails', async () => {
    fetchWsgGuidelinesMock.mockResolvedValueOnce({ ok: false, error: new Error('network') })

    const result = await loadGuidelines()

    expect(result.source).toBe('static-fallback')
    expect(result.guidelines).toHaveLength(1)
    expect(result.guidelines[0].id).toBe('3.1')
  })
})

describe('findGuidelineById', () => {
  it('finds guideline from loaded API source', async () => {
    fetchWsgGuidelinesMock.mockResolvedValueOnce({ ok: true, value: { category: [] } })
    mapApiToGuidelineEntriesMock.mockReturnValueOnce([
      {
        id: '4.2',
        title: 'API Guideline',
        section: 'Hosting',
        category: 'hosting',
        testability: 'automated',
        description: 'From API',
      },
    ])

    const result = await findGuidelineById('4.2')

    expect(result.source).toBe('w3c-api')
    expect(result.guideline?.id).toBe('4.2')
  })

  it('falls back to getGuidelineById when not found in loaded list', async () => {
    fetchWsgGuidelinesMock.mockResolvedValueOnce({ ok: true, value: { category: [] } })
    mapApiToGuidelineEntriesMock.mockReturnValueOnce([])
    getGuidelineByIdMock.mockReturnValueOnce({
      id: '3.1',
      title: 'Static Guideline',
      section: 'Web Development',
      category: 'web-dev',
      testability: 'manual-only',
      description: 'Static',
    })

    const result = await findGuidelineById('3.1')

    expect(result.source).toBe('static-fallback')
    expect(result.guideline?.id).toBe('3.1')
  })
})
