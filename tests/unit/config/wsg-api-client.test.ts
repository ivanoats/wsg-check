import { describe, it, expect, vi } from 'vitest'
import type { WsgApiResponse } from '@/config/wsg-api-types'

// ─── Mock axios ───────────────────────────────────────────────────────────────

const mockGet = vi.fn()
vi.mock('axios', () => ({
  default: { get: mockGet },
}))

// Import after vi.mock so mocks are in effect
const {
  WSG_GUIDELINES_API_URL,
  WsgApiError,
  TESTABILITY_OVERLAY,
  fetchWsgGuidelines,
  mapApiToGuidelineEntries,
} = await import('@/config/wsg-api-client')

// ─── Minimal fixture ──────────────────────────────────────────────────────────

/** Minimal valid API response covering one guideline from each of the four sections. */
const MINIMAL_API_RESPONSE: WsgApiResponse = {
  title: 'Web Sustainability Guidelines',
  edition: 'Draft Note',
  lastModified: '2026-01-16',
  category: [
    { id: '1', name: 'Introduction' },
    {
      id: '2',
      name: 'User Experience Design',
      shortName: 'UX Design',
      guidelines: [
        {
          id: '1',
          url: 'https://www.w3.org/TR/web-sustainability-guidelines/#ux-1',
          guideline: 'Examine and disclose any external factors',
          subheading: 'Identify and disclose negative external factors.',
          criteria: [],
          benefits: [],
          GRI: [],
          tags: ['Research'],
        },
      ],
    },
    {
      id: '3',
      name: 'Web Development',
      shortName: 'Web Dev',
      guidelines: [
        {
          id: '3',
          url: 'https://www.w3.org/TR/web-sustainability-guidelines/#web-dev-3',
          guideline: 'Minify Your HTML, CSS, and JavaScript',
          subheading: 'Remove unnecessary whitespace and comments.',
          criteria: [],
          benefits: [],
          GRI: [],
          tags: ['Performance'],
        },
      ],
    },
    {
      id: '4',
      name: 'Hosting, Infrastructure and Systems',
      shortName: 'Hosting',
      guidelines: [
        {
          id: '2',
          url: 'https://www.w3.org/TR/web-sustainability-guidelines/#hosting-2',
          guideline: 'Optimize Browser Caching',
          subheading: 'Set cache-control headers to reduce repeat downloads.',
          criteria: [],
          benefits: [],
          GRI: [],
          tags: ['Performance'],
        },
      ],
    },
    {
      id: '5',
      name: 'Business Strategy and Product Management',
      shortName: 'Business',
      guidelines: [
        {
          id: '1',
          url: 'https://www.w3.org/TR/web-sustainability-guidelines/#business-1',
          guideline: 'Have an Ethical and Sustainability Product Strategy',
          subheading: 'Define a strategy that places sustainability at the core.',
          criteria: [],
          benefits: [],
          GRI: [],
          tags: ['Strategy'],
        },
      ],
    },
  ],
}

// ─── TESTABILITY_OVERLAY ──────────────────────────────────────────────────────

describe('TESTABILITY_OVERLAY', () => {
  it('is a non-empty Map', () => {
    expect(TESTABILITY_OVERLAY.size).toBeGreaterThan(0)
  })

  it('contains automated entries for known automated guidelines', () => {
    expect(TESTABILITY_OVERLAY.get('3.3')).toBe('automated')
    expect(TESTABILITY_OVERLAY.get('3.17')).toBe('automated')
    expect(TESTABILITY_OVERLAY.get('4.2')).toBe('automated')
  })

  it('contains semi-automated entries for known semi-automated guidelines', () => {
    expect(TESTABILITY_OVERLAY.get('2.6')).toBe('semi-automated')
    expect(TESTABILITY_OVERLAY.get('4.1')).toBe('semi-automated')
  })

  it('does not contain a manual-only entry (those are the default)', () => {
    // Manual-only guidelines are intentionally absent from the overlay so they
    // default automatically; no manual-only value should be explicitly set.
    for (const value of TESTABILITY_OVERLAY.values()) {
      expect(value).not.toBe('manual-only')
    }
  })
})

// ─── mapApiToGuidelineEntries ─────────────────────────────────────────────────

describe('mapApiToGuidelineEntries', () => {
  it('returns one entry per guideline across all sections', () => {
    const entries = mapApiToGuidelineEntries(MINIMAL_API_RESPONSE, TESTABILITY_OVERLAY)
    expect(entries).toHaveLength(4)
  })

  it('skips Introduction category (id "1") which has no guidelines', () => {
    const entries = mapApiToGuidelineEntries(MINIMAL_API_RESPONSE, TESTABILITY_OVERLAY)
    expect(entries.every((e) => !e.id.startsWith('1.'))).toBe(true)
  })

  it('builds absolute IDs from category + relative guideline IDs', () => {
    const entries = mapApiToGuidelineEntries(MINIMAL_API_RESPONSE, TESTABILITY_OVERLAY)
    const ids = entries.map((e) => e.id)
    expect(ids).toContain('2.1')
    expect(ids).toContain('3.3')
    expect(ids).toContain('4.2')
    expect(ids).toContain('5.1')
  })

  it('maps category IDs to WSGCategory enum values', () => {
    const entries = mapApiToGuidelineEntries(MINIMAL_API_RESPONSE, TESTABILITY_OVERLAY)
    const byId = Object.fromEntries(entries.map((e) => [e.id, e]))
    expect(byId['2.1'].category).toBe('ux')
    expect(byId['3.3'].category).toBe('web-dev')
    expect(byId['4.2'].category).toBe('hosting')
    expect(byId['5.1'].category).toBe('business')
  })

  it('uses the overlay testability for known guidelines', () => {
    const entries = mapApiToGuidelineEntries(MINIMAL_API_RESPONSE, TESTABILITY_OVERLAY)
    const entry33 = entries.find((e) => e.id === '3.3')
    // 3.3 is in TESTABILITY_OVERLAY as 'automated'
    expect(entry33?.testability).toBe('automated')
  })

  it('defaults to manual-only for guidelines absent from the overlay', () => {
    const entries = mapApiToGuidelineEntries(MINIMAL_API_RESPONSE, TESTABILITY_OVERLAY)
    // 2.1 is not in the overlay
    const entry21 = entries.find((e) => e.id === '2.1')
    expect(entry21?.testability).toBe('manual-only')
  })

  it('populates specUrl from the API guideline URL', () => {
    const entries = mapApiToGuidelineEntries(MINIMAL_API_RESPONSE, TESTABILITY_OVERLAY)
    const entry33 = entries.find((e) => e.id === '3.3')
    expect(entry33?.specUrl).toBe('https://www.w3.org/TR/web-sustainability-guidelines/#web-dev-3')
  })

  it('uses the guideline title (not subheading) as entry title', () => {
    const entries = mapApiToGuidelineEntries(MINIMAL_API_RESPONSE, TESTABILITY_OVERLAY)
    const entry33 = entries.find((e) => e.id === '3.3')
    expect(entry33?.title).toBe('Minify Your HTML, CSS, and JavaScript')
  })

  it('uses subheading as description', () => {
    const entries = mapApiToGuidelineEntries(MINIMAL_API_RESPONSE, TESTABILITY_OVERLAY)
    const entry33 = entries.find((e) => e.id === '3.3')
    expect(entry33?.description).toBe('Remove unnecessary whitespace and comments.')
  })

  it('returns an empty array for an empty API response', () => {
    const empty: WsgApiResponse = {
      title: 'WSG',
      edition: 'Draft',
      lastModified: '2026-01-01',
      category: [],
    }
    expect(mapApiToGuidelineEntries(empty, TESTABILITY_OVERLAY)).toHaveLength(0)
  })

  it('handles a response where all categories lack guidelines', () => {
    const noGuidelines: WsgApiResponse = {
      title: 'WSG',
      edition: 'Draft',
      lastModified: '2026-01-01',
      category: [
        { id: '1', name: 'Introduction' },
        { id: '2', name: 'User Experience Design', shortName: 'UX Design' },
      ],
    }
    expect(mapApiToGuidelineEntries(noGuidelines, TESTABILITY_OVERLAY)).toHaveLength(0)
  })
})

// ─── fetchWsgGuidelines ───────────────────────────────────────────────────────

describe('fetchWsgGuidelines', () => {
  it('exposes the correct API URL constant', () => {
    expect(WSG_GUIDELINES_API_URL).toBe('https://w3c.github.io/sustainableweb-wsg/guidelines.json')
  })

  it('returns ok result with parsed data on success', async () => {
    mockGet.mockResolvedValueOnce({ data: MINIMAL_API_RESPONSE })

    const result = await fetchWsgGuidelines()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.title).toBe('Web Sustainability Guidelines')
      expect(result.value.category).toHaveLength(5)
    }
  })

  it('calls axios.get with the correct URL and options', async () => {
    mockGet.mockResolvedValueOnce({ data: MINIMAL_API_RESPONSE })

    await fetchWsgGuidelines()

    expect(mockGet).toHaveBeenCalledWith(WSG_GUIDELINES_API_URL, {
      timeout: 10_000,
      headers: { Accept: 'application/json' },
    })
  })

  it('returns err result when axios throws a network error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'))

    const result = await fetchWsgGuidelines()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(WsgApiError)
      expect(result.error.message).toContain('Failed to fetch WSG guidelines')
    }
  })

  it('preserves the original error as cause on failure', async () => {
    const originalError = new Error('timeout')
    mockGet.mockRejectedValueOnce(originalError)

    const result = await fetchWsgGuidelines()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.cause).toBe(originalError)
    }
  })
})

// ─── WsgApiError ─────────────────────────────────────────────────────────────

describe('WsgApiError', () => {
  it('has the correct name', () => {
    const e = new WsgApiError('test')
    expect(e.name).toBe('WsgApiError')
  })

  it('inherits from Error', () => {
    expect(new WsgApiError('test')).toBeInstanceOf(Error)
  })

  it('stores the cause', () => {
    const cause = new Error('root cause')
    const e = new WsgApiError('wrapper', cause)
    expect(e.cause).toBe(cause)
  })
})
