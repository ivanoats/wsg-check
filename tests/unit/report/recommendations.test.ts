import { describe, it, expect } from 'vitest'
import {
  buildRecommendations,
  COMPLEMENTARY_TOOLS,
  CWV_GUIDELINE_IDS,
} from '@/report/recommendations'
import type { ComplementaryTool } from '@/report/recommendations'
import type { CheckResult } from '@/core/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeCheckResult = (overrides: Partial<CheckResult> = {}): CheckResult => ({
  guidelineId: '4.2',
  guidelineName: 'Optimise Browser Caching',
  successCriterion: 'Cache-Control header present',
  status: 'pass',
  score: 100,
  message: 'Passed',
  impact: 'medium',
  category: 'hosting',
  machineTestable: true,
  ...overrides,
})

// ─── buildRecommendations ─────────────────────────────────────────────────────

describe('buildRecommendations', () => {
  it('returns an empty array when all results pass', () => {
    const results = [makeCheckResult({ status: 'pass' }), makeCheckResult({ status: 'pass' })]
    expect(buildRecommendations(results)).toHaveLength(0)
  })

  it('excludes info and not-applicable results', () => {
    const results = [
      makeCheckResult({ status: 'info' }),
      makeCheckResult({ status: 'not-applicable' }),
    ]
    expect(buildRecommendations(results)).toHaveLength(0)
  })

  it('excludes fail/warn results that lack a recommendation string', () => {
    const results = [
      makeCheckResult({ status: 'fail' }), // no recommendation field
      makeCheckResult({ status: 'warn' }), // no recommendation field
    ]
    expect(buildRecommendations(results)).toHaveLength(0)
  })

  it('includes fail results with a recommendation string', () => {
    const results = [makeCheckResult({ status: 'fail', recommendation: 'Enable caching headers.' })]
    expect(buildRecommendations(results)).toHaveLength(1)
  })

  it('includes warn results with a recommendation string', () => {
    const results = [makeCheckResult({ status: 'warn', recommendation: 'Improve cache TTL.' })]
    expect(buildRecommendations(results)).toHaveLength(1)
  })

  it('maps check fields to recommendation fields', () => {
    const results = [
      makeCheckResult({
        guidelineId: '4.2',
        guidelineName: 'Optimise Browser Caching',
        status: 'fail',
        impact: 'high',
        recommendation: 'Add Cache-Control headers.',
        resources: [
          'https://www.w3.org/TR/web-sustainability-guidelines/#optimise-browser-caching',
        ],
      }),
    ]
    const [rec] = buildRecommendations(results)
    expect(rec.guidelineId).toBe('4.2')
    expect(rec.guidelineName).toBe('Optimise Browser Caching')
    expect(rec.status).toBe('fail')
    expect(rec.impact).toBe('high')
    expect(rec.recommendation).toBe('Add Cache-Control headers.')
    expect(rec.resources).toContain(
      'https://www.w3.org/TR/web-sustainability-guidelines/#optimise-browser-caching'
    )
  })

  it('omits the resources key when no resources are present and the guideline is not CWV-sensitive', () => {
    const results = [
      makeCheckResult({ status: 'fail', recommendation: 'Fix it.', guidelineId: '4.2' }),
    ]
    const [rec] = buildRecommendations(results)
    expect(rec).not.toHaveProperty('resources')
  })

  describe('sorting', () => {
    it('sorts by impact: high before medium before low', () => {
      const results = [
        makeCheckResult({ status: 'fail', impact: 'low', recommendation: 'Low fix' }),
        makeCheckResult({ status: 'fail', impact: 'high', recommendation: 'High fix' }),
        makeCheckResult({ status: 'fail', impact: 'medium', recommendation: 'Med fix' }),
      ]
      const recs = buildRecommendations(results)
      expect(recs[0].impact).toBe('high')
      expect(recs[1].impact).toBe('medium')
      expect(recs[2].impact).toBe('low')
    })

    it('sorts fail before warn within the same impact tier', () => {
      const results = [
        makeCheckResult({ status: 'warn', impact: 'high', recommendation: 'Warn fix' }),
        makeCheckResult({ status: 'fail', impact: 'high', recommendation: 'Fail fix' }),
      ]
      const recs = buildRecommendations(results)
      expect(recs[0].status).toBe('fail')
      expect(recs[1].status).toBe('warn')
    })
  })

  describe('CWV guideline enrichment', () => {
    it('appends a PageSpeed Insights link for guideline 3.1 when pageUrl is provided', () => {
      const results = [
        makeCheckResult({
          guidelineId: '3.1',
          status: 'fail',
          recommendation: 'Reduce page weight.',
          resources: ['https://www.w3.org/TR/web-sustainability-guidelines/#performance-goals'],
        }),
      ]
      const recs = buildRecommendations(results, 'https://example.com')
      expect(recs[0].resources).toContain(
        'https://pagespeed.web.dev/report?url=https%3A%2F%2Fexample.com'
      )
    })

    it('appends a PageSpeed Insights link for guideline 3.8 when pageUrl is provided', () => {
      const results = [
        makeCheckResult({
          guidelineId: '3.8',
          status: 'fail',
          recommendation: 'Add defer to scripts.',
          resources: [
            'https://www.w3.org/TR/web-sustainability-guidelines/#resolve-render-blocking-content',
          ],
        }),
      ]
      const recs = buildRecommendations(results, 'https://example.com')
      expect(recs[0].resources).toContain(
        'https://pagespeed.web.dev/report?url=https%3A%2F%2Fexample.com'
      )
    })

    it('URL-encodes the page URL in the PageSpeed Insights link', () => {
      const results = [
        makeCheckResult({ guidelineId: '3.1', status: 'warn', recommendation: 'Reduce size.' }),
      ]
      const recs = buildRecommendations(results, 'https://example.com/path?q=1')
      const psLink = (recs[0].resources ?? []).find((r) =>
        r.startsWith('https://pagespeed.web.dev/')
      )
      expect(psLink).toBe(
        'https://pagespeed.web.dev/report?url=https%3A%2F%2Fexample.com%2Fpath%3Fq%3D1'
      )
    })

    it('preserves existing resources and appends the CWV link', () => {
      const results = [
        makeCheckResult({
          guidelineId: '3.1',
          status: 'fail',
          recommendation: 'Reduce page weight.',
          resources: ['https://www.w3.org/TR/web-sustainability-guidelines/#performance-goals'],
        }),
      ]
      const recs = buildRecommendations(results, 'https://example.com')
      expect(recs[0].resources).toHaveLength(2)
      expect(recs[0].resources?.[0]).toContain('w3.org')
      expect(recs[0].resources?.[1]).toContain('pagespeed.web.dev')
    })

    it('adds a PageSpeed Insights link even when the check has no existing resources', () => {
      const results = [
        makeCheckResult({ guidelineId: '3.1', status: 'fail', recommendation: 'Reduce size.' }),
      ]
      const recs = buildRecommendations(results, 'https://example.com')
      expect(recs[0].resources).toHaveLength(1)
      expect(recs[0].resources?.[0]).toContain('pagespeed.web.dev')
    })

    it('does NOT append a PageSpeed Insights link when pageUrl is omitted', () => {
      const results = [
        makeCheckResult({ guidelineId: '3.1', status: 'fail', recommendation: 'Reduce size.' }),
      ]
      const recs = buildRecommendations(results) // no pageUrl
      expect(recs[0].resources).toBeUndefined()
    })

    it('does NOT append a CWV link for non-CWV guidelines', () => {
      const results = [
        makeCheckResult({
          guidelineId: '4.2',
          status: 'fail',
          recommendation: 'Add Cache-Control.',
        }),
      ]
      const recs = buildRecommendations(results, 'https://example.com')
      expect(recs[0].resources).toBeUndefined()
    })
  })
})

// ─── COMPLEMENTARY_TOOLS ──────────────────────────────────────────────────────

describe('COMPLEMENTARY_TOOLS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(COMPLEMENTARY_TOOLS)).toBe(true)
    expect(COMPLEMENTARY_TOOLS.length).toBeGreaterThan(0)
  })

  it('each tool has a name, url, and description', () => {
    for (const tool of COMPLEMENTARY_TOOLS as ReadonlyArray<ComplementaryTool>) {
      expect(typeof tool.name).toBe('string')
      expect(typeof tool.url).toBe('string')
      expect(typeof tool.description).toBe('string')
      expect(tool.name.length).toBeGreaterThan(0)
      expect(tool.url).toMatch(/^https?:\/\//)
      expect(tool.description.length).toBeGreaterThan(0)
    }
  })

  it('includes Google PageSpeed Insights', () => {
    const names = COMPLEMENTARY_TOOLS.map((t) => t.name)
    expect(names.some((n) => n.toLowerCase().includes('pagespeed'))).toBe(true)
  })

  it('includes GreenFrame', () => {
    const names = COMPLEMENTARY_TOOLS.map((t) => t.name)
    expect(names.some((n) => n.toLowerCase().includes('greenframe'))).toBe(true)
  })

  it('includes Sitespeed.io', () => {
    const names = COMPLEMENTARY_TOOLS.map((t) => t.name)
    expect(names.some((n) => n.toLowerCase().includes('sitespeed'))).toBe(true)
  })

  it('includes WebPageTest', () => {
    const names = COMPLEMENTARY_TOOLS.map((t) => t.name)
    expect(names.some((n) => n.toLowerCase().includes('webpagetest'))).toBe(true)
  })
})

// ─── CWV_GUIDELINE_IDS ────────────────────────────────────────────────────────

describe('CWV_GUIDELINE_IDS', () => {
  it('includes guideline 3.1 (Set Performance Budgets)', () => {
    expect(CWV_GUIDELINE_IDS).toContain('3.1')
  })

  it('includes guideline 3.8 (Resolve Render Blocking Content)', () => {
    expect(CWV_GUIDELINE_IDS).toContain('3.8')
  })
})
