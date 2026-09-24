import { describe, it, expect } from 'vitest'
import {
  GUIDELINES_REGISTRY,
  LEGACY_GUIDELINE_IDS,
  TESTABILITY_OVERLAY,
  UNMAPPED_LEGACY_IDS,
  getGuidelineById,
  getGuidelinesByCategory,
  getGuidelinesByTestability,
  isLegacyGuidelineId,
  checkMatchesGuideline,
  mapSpecToGuidelineEntries,
  resolveGuidelineId,
} from '@/config/guidelines-registry'
import { WSG_SPEC } from '@/config/spec/index'
import type { WsgSpecData } from '@/config/wsg-spec-types'
import {
  hostingChecks,
  performanceChecks,
  securityChecks,
  semanticChecks,
  sustainabilityChecks,
  uxDesignChecks,
} from '@/checks/index'

const SLUGS = new Set(GUIDELINES_REGISTRY.map((g) => g.id))

const ALL_CHECKS = [
  ...performanceChecks,
  ...semanticChecks,
  ...sustainabilityChecks,
  ...securityChecks,
  ...uxDesignChecks,
  ...hostingChecks,
]

describe('GUIDELINES_REGISTRY', () => {
  it('is a non-empty array', () => {
    expect(GUIDELINES_REGISTRY.length).toBeGreaterThan(0)
  })

  it('contains guidelines from all four categories', () => {
    const categories = new Set(GUIDELINES_REGISTRY.map((g) => g.category))
    expect(categories).toContain('ux')
    expect(categories).toContain('web-dev')
    expect(categories).toContain('hosting')
    expect(categories).toContain('business')
  })

  it('contains guidelines with all three testability levels', () => {
    const levels = new Set(GUIDELINES_REGISTRY.map((g) => g.testability))
    expect(levels).toContain('automated')
    expect(levels).toContain('semi-automated')
    expect(levels).toContain('manual-only')
  })

  it('has unique IDs', () => {
    const ids = GUIDELINES_REGISTRY.map((g) => g.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('matches the July-2026 release (17 / 16 / 12 / 26 guidelines)', () => {
    expect(WSG_SPEC.release).toBe('July-2026')
    expect(getGuidelinesByCategory('ux')).toHaveLength(17)
    expect(getGuidelinesByCategory('web-dev')).toHaveLength(16)
    expect(getGuidelinesByCategory('hosting')).toHaveLength(12)
    expect(getGuidelinesByCategory('business')).toHaveLength(26)
  })

  it('numbers guidelines by position within their section', () => {
    const webDev = getGuidelinesByCategory('web-dev')
    expect(webDev[0]?.number).toBe('3.1')
    expect(webDev[1]).toMatchObject({ id: 'minify-and-remove-unused-code', number: '3.2' })
  })

  it('uses the spec URL fragment as the ID', () => {
    for (const guideline of GUIDELINES_REGISTRY) {
      expect(guideline.specUrl).toBe(
        `https://www.w3.org/TR/web-sustainability-guidelines/#${guideline.id}`
      )
    }
  })

  it('each entry has required fields', () => {
    for (const guideline of GUIDELINES_REGISTRY) {
      expect(guideline.id).toBeTruthy()
      expect(guideline.number).toMatch(/^[2-5]\.\d+$/)
      expect(guideline.title).toBeTruthy()
      expect(guideline.section).toBeTruthy()
      expect(guideline.category).toBeTruthy()
      expect(guideline.testability).toBeTruthy()
      expect(guideline.description).toBeTruthy()
    }
  })
})

describe('spec drift guards', () => {
  it('only assigns testability to guidelines in the spec', () => {
    for (const slug of TESTABILITY_OVERLAY.keys()) {
      expect(SLUGS).toContain(slug)
    }
  })

  it('maps every legacy ID to a guideline in the spec', () => {
    for (const slug of LEGACY_GUIDELINE_IDS.values()) {
      expect(SLUGS).toContain(slug)
    }
  })

  it('resolves every check guideline ID, or lists it as unmapped', () => {
    for (const check of ALL_CHECKS) {
      const known =
        resolveGuidelineId(check.guidelineId) !== undefined ||
        UNMAPPED_LEGACY_IDS.has(check.guidelineId)
      expect(known, `check guideline ID "${check.guidelineId}"`).toBe(true)
    }
  })
})

describe('check guideline slugs', () => {
  it('only declares slugs that exist in the spec', () => {
    for (const check of ALL_CHECKS) {
      if (check.guidelineSlug !== null) expect(SLUGS).toContain(check.guidelineSlug)
    }
  })

  it('leaves only the four checks without a July-2026 guideline unmapped', () => {
    // form validation 3.10, security headers 3.15, minimal forms 2.19, alt text 2.17
    const unmapped = ALL_CHECKS.filter((check) => check.guidelineSlug === null)
    expect(unmapped.map((check) => check.guidelineId).sort()).toEqual([
      '2.17',
      '2.19',
      '3.10',
      '3.15',
    ])
  })

  it('agrees with the legacy alias map for every check that has a slug', () => {
    for (const check of ALL_CHECKS) {
      if (check.guidelineSlug !== null) {
        expect(LEGACY_GUIDELINE_IDS.get(check.guidelineId)).toBe(check.guidelineSlug)
      }
    }
  })
})

describe('mapSpecToGuidelineEntries', () => {
  const spec: WsgSpecData = {
    title: 'WSG',
    edition: 'Draft',
    lastModified: '2026-01-01',
    category: [
      { id: '1', name: 'Introduction' },
      {
        id: '4',
        name: 'Hosting',
        guidelines: [
          {
            id: 'first-slug',
            url: 'https://example.com/#first-slug',
            guideline: 'First',
            subheading: 'First summary.',
            criteria: [],
            tags: [],
          },
          {
            id: 'second-slug',
            url: 'https://example.com/#second-slug',
            guideline: 'Second',
            subheading: 'Second summary.',
            criteria: [],
            tags: [],
          },
        ],
      },
    ],
  }

  it('skips sections without guidelines and numbers the rest by position', () => {
    const entries = mapSpecToGuidelineEntries(spec, new Map([['second-slug', 'automated']]))
    expect(entries).toEqual([
      {
        id: 'first-slug',
        number: '4.1',
        title: 'First',
        section: 'Hosting',
        category: 'hosting',
        testability: 'manual-only',
        description: 'First summary.',
        specUrl: 'https://example.com/#first-slug',
      },
      {
        id: 'second-slug',
        number: '4.2',
        title: 'Second',
        section: 'Hosting',
        category: 'hosting',
        testability: 'automated',
        description: 'Second summary.',
        specUrl: 'https://example.com/#second-slug',
      },
    ])
  })
})

describe('resolveGuidelineId', () => {
  it('returns a slug unchanged', () => {
    expect(resolveGuidelineId('use-sustainable-hosting')).toBe('use-sustainable-hosting')
  })

  it('maps a legacy numeric ID to its slug', () => {
    expect(resolveGuidelineId('3.3')).toBe('minify-and-remove-unused-code')
  })

  it('does not treat a July-2026 position number as an ID', () => {
    // 3.2 is minify's position in July-2026, but not a legacy check ID.
    expect(resolveGuidelineId('3.2')).toBeUndefined()
  })

  it('returns undefined for unmapped legacy IDs and unknown IDs', () => {
    expect(resolveGuidelineId('3.15')).toBeUndefined()
    expect(resolveGuidelineId('no-such-guideline')).toBeUndefined()
  })
})

describe('isLegacyGuidelineId', () => {
  it('is true for mapped and unmapped legacy IDs', () => {
    expect(isLegacyGuidelineId('3.3')).toBe(true)
    expect(isLegacyGuidelineId('3.15')).toBe(true)
  })

  it('is false for slugs and unknown IDs', () => {
    expect(isLegacyGuidelineId('minify-and-remove-unused-code')).toBe(false)
    expect(isLegacyGuidelineId('9.9')).toBe(false)
  })
})

describe('checkMatchesGuideline', () => {
  const docs = {
    guidelineId: '2.17',
    guidelineSlug: 'reduce-the-impact-of-downloadable-and-physical-documents',
  }
  const altText = { guidelineId: '2.17', guidelineSlug: null }

  it('matches a check by the slug it declares', () => {
    expect(
      checkMatchesGuideline(docs, 'reduce-the-impact-of-downloadable-and-physical-documents')
    ).toBe(true)
  })

  it('does not match a check whose legacy ID aliases to the slug but has no slug itself', () => {
    expect(
      checkMatchesGuideline(altText, 'reduce-the-impact-of-downloadable-and-physical-documents')
    ).toBe(false)
  })

  it('matches every check registered under a legacy ID', () => {
    expect(checkMatchesGuideline(docs, '2.17')).toBe(true)
    expect(checkMatchesGuideline(altText, '2.17')).toBe(true)
  })

  it('matches legacy IDs exactly, not via their slug', () => {
    const metadata = {
      guidelineId: '3.4',
      guidelineSlug: 'structure-metadata-for-machine-readability',
    }
    // 3.11 (structured data) maps to the same slug but is a different check.
    expect(checkMatchesGuideline(metadata, '3.11')).toBe(false)
  })

  it('does not match unknown IDs', () => {
    expect(checkMatchesGuideline(docs, 'no-such-guideline')).toBe(false)
    expect(checkMatchesGuideline(altText, 'no-such-guideline')).toBe(false)
  })
})

describe('getGuidelineById', () => {
  it('returns the guideline for a slug', () => {
    expect(getGuidelineById('minify-and-remove-unused-code')?.title).toBe(
      'Minify and remove unused code'
    )
  })

  it('returns the guideline for a legacy numeric ID', () => {
    const guideline = getGuidelineById('3.3')
    expect(guideline?.id).toBe('minify-and-remove-unused-code')
  })

  it('returns undefined for an unknown ID', () => {
    expect(getGuidelineById('99.99')).toBeUndefined()
  })
})

describe('getGuidelinesByCategory', () => {
  it('returns only ux guidelines', () => {
    const results = getGuidelinesByCategory('ux')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((g) => g.category === 'ux')).toBe(true)
  })

  it('returns only hosting guidelines', () => {
    const results = getGuidelinesByCategory('hosting')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((g) => g.category === 'hosting')).toBe(true)
  })
})

describe('getGuidelinesByTestability', () => {
  it('returns only automated guidelines', () => {
    const results = getGuidelinesByTestability('automated')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((g) => g.testability === 'automated')).toBe(true)
  })

  it('returns only manual-only guidelines', () => {
    const results = getGuidelinesByTestability('manual-only')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((g) => g.testability === 'manual-only')).toBe(true)
  })
})
