/**
 * Phase 6.3 – Recommendations Engine
 *
 * Provides `buildRecommendations`, the authoritative function that derives a
 * priority-ordered list of actionable improvement recommendations from
 * `CheckResult` objects.
 *
 * Enhancements over the Phase 6.1 stub in `types.ts`:
 *   - For WSG 3.1 (Set Performance Budgets) and WSG 3.8 (Resolve Render
 *     Blocking Content): a parameterised Google PageSpeed Insights link is
 *     appended to `resources` so that the reader knows where to obtain live
 *     Core Web Vitals data, which static analysis cannot measure.
 *   - Exports `COMPLEMENTARY_TOOLS`: structured references to external tools
 *     covering sustainability and performance dimensions that wsg-check's
 *     static analysis does not address (scenario-based energy monitoring,
 *     real-browser performance audits, and waterfall / carbon estimates).
 *
 * @module
 */

import type { CheckResult } from '../core/types.js'
import type { Recommendation } from './types.js'

// ─── Complementary tools ──────────────────────────────────────────────────────

/**
 * A reference to an external tool that covers sustainability or performance
 * dimensions not measurable through static HTML/HTTP analysis alone.
 */
export interface ComplementaryTool {
  /** Display name of the tool. */
  readonly name: string
  /** Tool home page URL. */
  readonly url: string
  /** One-sentence description of what the tool measures. */
  readonly description: string
}

/**
 * External tools that cover dimensions wsg-check cannot assess from static
 * HTML/HTTP analysis alone.  Include this list in reports or documentation to
 * give users a complete picture of their site's sustainability and performance.
 *
 * - **Google PageSpeed Insights / Lighthouse** — Core Web Vitals from real Chrome users.
 * - **GreenFrame** — Scenario-based energy monitoring.
 * - **Sitespeed.io** — Performance + sustainability with a real browser.
 * - **WebPageTest** — Detailed waterfall analysis and carbon estimates.
 */
export const COMPLEMENTARY_TOOLS: ReadonlyArray<ComplementaryTool> = [
  {
    name: 'Google PageSpeed Insights / Lighthouse',
    url: 'https://pagespeed.web.dev/',
    description: 'Core Web Vitals and performance metrics measured from real-world Chrome users.',
  },
  {
    name: 'GreenFrame',
    url: 'https://greenframe.io/',
    description: 'Scenario-based energy monitoring for web applications.',
  },
  {
    name: 'Sitespeed.io',
    url: 'https://www.sitespeed.io/',
    description: 'Performance and sustainability analysis using a real browser.',
  },
  {
    name: 'WebPageTest',
    url: 'https://www.webpagetest.org/',
    description: 'Detailed waterfall analysis and carbon emission estimates.',
  },
]

// ─── CWV-sensitive guidelines ─────────────────────────────────────────────────

/**
 * WSG guideline IDs for which static analysis cannot measure Core Web Vitals.
 *
 * For recommendations derived from these guidelines a Google PageSpeed Insights
 * link — parameterised with the analysed page URL — is appended to `resources`
 * to direct the reader to live CWV data.
 *
 * - `'3.1'` – Set Performance Budgets
 * - `'3.8'` – Resolve Render Blocking Content
 */
export const CWV_GUIDELINE_IDS: ReadonlyArray<string> = ['3.1', '3.8']

// ─── Sorting helpers ──────────────────────────────────────────────────────────

const IMPACT_ORDER: Record<'high' | 'medium' | 'low', number> = {
  high: 0,
  medium: 1,
  low: 2,
}

const STATUS_ORDER: Record<'fail' | 'warn', number> = { fail: 0, warn: 1 }

// ─── Build recommendations ────────────────────────────────────────────────────

/**
 * Derives the priority-ordered `Recommendation` list from check results.
 *
 * - Only `'fail'` and `'warn'` results that carry a `recommendation` string
 *   are included.
 * - Results are sorted: `high` impact first, then `medium`, then `low`.
 *   Within the same impact tier, `fail` results precede `warn`.
 * - For guidelines in {@link CWV_GUIDELINE_IDS} (3.1 and 3.8), a
 *   parameterised Google PageSpeed Insights URL is appended to `resources` so
 *   that the reader knows where to get live Core Web Vitals data that static
 *   analysis cannot provide.
 *
 * @param results - Individual check results from a `RunResult`.
 * @param pageUrl - The URL that was analysed; used to build the PageSpeed
 *   Insights deep-link.  When omitted, no CWV link is added.
 */
export const buildRecommendations = (
  results: ReadonlyArray<CheckResult>,
  pageUrl?: string
): ReadonlyArray<Recommendation> =>
  results
    .filter(
      (r): r is CheckResult & { status: 'fail' | 'warn'; recommendation: string } =>
        (r.status === 'fail' || r.status === 'warn') && typeof r.recommendation === 'string'
    )
    .sort((a, b) => {
      const impactDiff = IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact]
      if (impactDiff !== 0) return impactDiff
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    })
    .map((r) => {
      const isCwvGuideline = CWV_GUIDELINE_IDS.includes(r.guidelineId)
      const cwvLink =
        isCwvGuideline && pageUrl
          ? `https://pagespeed.web.dev/report?url=${encodeURIComponent(pageUrl)}`
          : undefined

      const baseResources: ReadonlyArray<string> =
        r.resources && r.resources.length > 0 ? r.resources : []
      const resources: ReadonlyArray<string> = cwvLink ? [...baseResources, cwvLink] : baseResources

      return {
        guidelineId: r.guidelineId,
        guidelineName: r.guidelineName,
        status: r.status,
        impact: r.impact,
        recommendation: r.recommendation,
        ...(resources.length > 0 ? { resources } : {}),
      } satisfies Recommendation
    })
