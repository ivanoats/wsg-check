// @vitest-environment node
/**
 * Unit tests for the check_url projection and Markdown helpers, and for
 * handler paths that are awkward to reach through a real client.
 */

import { describe, it, expect, vi } from 'vitest'
import type { SustainabilityReport } from '@/report/types'

const runReportMock = vi.fn()
vi.mock('@/pipeline/index', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/pipeline/index')>()),
  runReport: runReportMock,
}))

const { summarizeReport, summaryToMarkdown, handleCheckUrl } = await import('@/mcp/check-url')

type Check = SustainabilityReport['checks'][number]

const check = (overrides: Partial<Check>): Check => ({
  guidelineId: 'some-guideline',
  guidelineName: 'Some guideline',
  successCriterion: 'criterion',
  status: 'fail',
  score: 0,
  message: 'message',
  impact: 'medium',
  category: 'web-dev',
  machineTestable: true,
  ...overrides,
})

const report = (overrides: Partial<SustainabilityReport> = {}): SustainabilityReport =>
  ({
    url: 'https://example.com/',
    timestamp: '2026-01-01T00:00:00.000Z',
    duration: 10,
    overallScore: 70,
    grade: 'C',
    specVersion: 'July-2026',
    categories: [{ category: 'web-dev', score: 70 }],
    checks: [],
    summary: {
      totalChecks: 3,
      passed: 1,
      failed: 1,
      warnings: 1,
      notApplicable: 0,
      relatedChecks: 1,
    },
    recommendations: [],
    metadata: { pageWeight: 100, requestCount: 1, thirdPartyCount: 0 },
    methodology: {},
    ...overrides,
  }) as unknown as SustainabilityReport

describe('summarizeReport', () => {
  it('falls back to the requested URL and omits unmeasured carbon fields', () => {
    const summary = summarizeReport(report(), [])
    expect(summary.finalUrl).toBe('https://example.com/')
    expect(summary.carbon).toEqual({})
  })

  it('keeps only failed and warned checks, WSG first, by impact, failures first', () => {
    const summary = summarizeReport(
      report({
        checks: [
          check({ guidelineId: 'passed', status: 'pass' }),
          check({ guidelineId: 'related-high', related: true, impact: 'high' }),
          check({ guidelineId: 'warn-high', status: 'warn', impact: 'high' }),
          check({ guidelineId: 'fail-low', impact: 'low' }),
          check({ guidelineId: 'fail-high', impact: 'high' }),
          check({ guidelineId: 'fail-high-2', impact: 'high' }),
          check({ guidelineId: 'info', status: 'info' }),
        ],
      }),
      ['a notice']
    )

    expect(summary.issues.map((i) => i.guidelineId)).toEqual([
      'fail-high',
      'fail-high-2',
      'warn-high',
      'fail-low',
      'related-high',
    ])
    expect(summary.notices).toEqual(['a notice'])
  })
})

describe('summaryToMarkdown', () => {
  it('labels related checks and omits the carbon line when it was not measured', () => {
    const text = summaryToMarkdown(
      summarizeReport(
        report({
          checks: [
            check({ guidelineName: 'Image alt text', related: true, message: 'Missing alt' }),
            check({
              guidelineNumber: '3.2',
              guidelineName: 'Minify code',
              recommendation: 'Minify it.',
            }),
          ],
        }),
        []
      )
    )

    expect(text).toContain('Image alt text (related, not scored): Missing alt')
    expect(text).toContain('3.2 Minify code: message Fix: Minify it.')
    expect(text).not.toContain('CO₂')
  })

  it('reports no issues, a redirect, and a carbon estimate without a model', () => {
    const text = summaryToMarkdown(
      summarizeReport(
        report({
          metadata: {
            finalUrl: 'https://example.com/en',
            pageWeight: 100,
            requestCount: 1,
            thirdPartyCount: 0,
            co2PerPageView: 0.01,
          },
        }),
        []
      )
    )

    expect(text).toContain('## Issues (0)\nNone.')
    expect(text).toContain('Requested https://example.com/, redirected.')
    expect(text).toContain('0.01 g CO₂ per page view (unknown model); green hosting: no.')
  })
})

describe('handleCheckUrl', () => {
  it('still returns the report when sending a progress notification fails', async () => {
    runReportMock.mockImplementation(
      async (_url: string, { config }: { config: { onProgress?: (s: string) => void } }) => {
        config.onProgress?.('fetching')
        return { ok: true, value: report() }
      }
    )
    const sendNotification = vi.fn().mockRejectedValue(new Error('transport closed'))

    const result = await handleCheckUrl(
      { url: 'https://example.com/' },
      { signal: new AbortController().signal, _meta: { progressToken: 7 }, sendNotification },
      { hostPolicy: { allowLoopback: true, allowPrivateNetwork: false } }
    )

    expect(sendNotification).toHaveBeenCalledOnce()
    expect(result.isError).toBeFalsy()
  })
})
