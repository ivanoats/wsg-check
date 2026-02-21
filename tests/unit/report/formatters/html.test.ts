import { describe, it, expect } from 'vitest'
import { formatHtml } from '@/report/formatters/html'
import type { SustainabilityReport } from '@/report/types'
import type { RunResult, CheckResult, CategoryScore } from '@/core/types'
import { fromRunResult } from '@/report/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeCheckResult(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    guidelineId: '3.1',
    guidelineName: 'Test guideline',
    successCriterion: 'Test criterion',
    status: 'pass',
    score: 100,
    message: 'Passed',
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
    ...overrides,
  }
}

function makeCategoryScore(overrides: Partial<CategoryScore> = {}): CategoryScore {
  return {
    category: 'web-dev',
    score: 100,
    totalChecks: 1,
    passed: 1,
    failed: 0,
    warned: 0,
    notApplicable: 0,
    scoredChecks: 1,
    ...overrides,
  }
}

function makeRunResult(overrides: Partial<RunResult> = {}): RunResult {
  return {
    url: 'https://example.com',
    timestamp: '2024-01-01T00:00:00.000Z',
    duration: 1500,
    overallScore: 80,
    categoryScores: [makeCategoryScore()],
    results: [makeCheckResult()],
    co2PerPageView: 0.0012,
    co2Model: 'swd-v4',
    isGreenHosted: false,
    ...overrides,
  }
}

function makeReport(overrides: Partial<RunResult> = {}): SustainabilityReport {
  return fromRunResult(makeRunResult(overrides), 12345, 42, 7)
}

// ─── formatHtml ───────────────────────────────────────────────────────────────

describe('formatHtml', () => {
  it('returns a string starting with <!DOCTYPE html>', () => {
    const html = formatHtml(makeReport())
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/)
  })

  it('contains a <title> tag with the URL', () => {
    const html = formatHtml(makeReport())
    expect(html).toContain('<title>')
    expect(html).toContain('example.com')
  })

  it('includes the overall score', () => {
    const html = formatHtml(makeReport({ overallScore: 80 }))
    expect(html).toContain('80')
  })

  it('includes the grade', () => {
    const html = formatHtml(makeReport({ overallScore: 80 }))
    expect(html).toContain('B')
  })

  it('includes the URL in the document body', () => {
    const html = formatHtml(makeReport())
    expect(html).toContain('https://example.com')
  })

  it('contains a Category Scores heading', () => {
    const html = formatHtml(makeReport())
    expect(html).toContain('Category Scores')
  })

  it('contains a Recommendations heading', () => {
    const html = formatHtml(makeReport())
    expect(html).toContain('Recommendations')
  })

  it('contains a Check Results heading', () => {
    const html = formatHtml(makeReport())
    expect(html).toContain('Check Results')
  })

  it('contains a Page Metrics heading', () => {
    const html = formatHtml(makeReport())
    expect(html).toContain('Page Metrics')
  })

  it('contains a Methodology heading', () => {
    const html = formatHtml(makeReport())
    expect(html).toContain('Methodology')
  })

  it('includes inline CSS', () => {
    const html = formatHtml(makeReport())
    expect(html).toContain('<style>')
  })

  it('escapes special HTML characters in URL to prevent XSS', () => {
    const xssUrl = 'https://example.com/path?q=<script>alert(1)</script>'
    const report = fromRunResult(makeRunResult({ url: xssUrl }))
    const html = formatHtml(report)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('replaces javascript: URL in href with # to prevent protocol XSS', () => {
    const jsUrl = 'javascript:alert(1)'
    const report = fromRunResult(makeRunResult({ url: jsUrl }))
    const html = formatHtml(report)
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('href="#"')
  })

  it('escapes special HTML characters in guideline names', () => {
    const results = [makeCheckResult({ guidelineName: 'A & B <test>' })]
    const report = fromRunResult(makeRunResult({ results }))
    const html = formatHtml(report)
    expect(html).not.toContain('A & B <test>')
    expect(html).toContain('A &amp; B &lt;test&gt;')
  })

  it('shows green hosting status', () => {
    const report = fromRunResult(makeRunResult({ isGreenHosted: true }))
    const html = formatHtml(report)
    expect(html).toContain('Yes')
  })

  it('includes CO₂ data when present', () => {
    const report = fromRunResult(makeRunResult({ co2PerPageView: 0.0025 }))
    const html = formatHtml(report)
    expect(html).toContain('0.0025')
  })

  it('closes html tag at the end', () => {
    const html = formatHtml(makeReport())
    expect(html.trimEnd()).toMatch(/<\/html>$/)
  })

  it('includes the "no recommendations" message when there are none', () => {
    const report = makeReport()
    const html = formatHtml(report)
    expect(html).toContain('No recommendations')
  })

  it('renders recommendation items when present', () => {
    const results = [
      makeCheckResult({
        status: 'fail',
        impact: 'high',
        recommendation: 'Minify all assets',
        guidelineId: '3.1',
        guidelineName: 'Performance Goals',
      }),
    ]
    const report = fromRunResult(makeRunResult({ results }))
    const html = formatHtml(report)
    expect(html).toContain('Minify all assets')
    expect(html).toContain('3.1')
  })
})
