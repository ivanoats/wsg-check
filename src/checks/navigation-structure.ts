/**
 * WSG 2.8 – Ensure Navigation and Way-Finding Are Well-Structured
 *
 * Validates that the page provides clear navigation structure so visitors
 * find content quickly without unnecessary page loads:
 *
 *   1. Navigation landmark — a `<nav>` element (or `role="navigation"`) must
 *      be present to identify the navigation region for assistive technology
 *      and to signal a well-structured page.
 *
 *   2. Breadcrumbs — for pages within a hierarchy, breadcrumb navigation
 *      (`aria-label="breadcrumb"` or Schema.org BreadcrumbList) helps users
 *      understand their location and navigate back without retracing steps.
 *
 * Scoring:
 *   - No nav landmark                         → fail  (0)
 *   - Nav present, no breadcrumbs             → warn (50)
 *   - Both nav and breadcrumbs present        → pass (100)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#navigation-structure
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '2.8'
const GUIDELINE_NAME = 'Ensure Navigation and Way-Finding Are Well-Structured'
const SUCCESS_CRITERION =
  'Pages should have navigation landmarks and breadcrumbs for efficient way-finding'
const RESOURCES = ['https://www.w3.org/TR/web-sustainability-guidelines/#navigation-structure']

/** Matches a breadcrumb `aria-label` on any element. */
const BREADCRUMB_ARIA_PATTERN = /aria-label=["'][^"']*breadcrumb[^"']*["']/i

/** Schema.org type used for breadcrumb structured data. */
const BREADCRUMB_SCHEMA_TYPE = 'BreadcrumbList'

export const checkNavigationStructure: CheckFn = (page) => {
  const { landmarks, structuredData } = page.parsedPage
  const body = page.fetchResult.body
  const issues: string[] = []

  // ── Navigation landmark ───────────────────────────────────────────────────
  const hasNav = landmarks.includes('nav') || landmarks.includes('navigation')

  if (!hasNav) {
    issues.push('No navigation landmark (<nav> element or role="navigation") detected')
  }

  // ── Breadcrumb navigation ─────────────────────────────────────────────────
  const hasBreadcrumbAria = BREADCRUMB_ARIA_PATTERN.test(body)
  const hasBreadcrumbSchema = structuredData.some((sd) => sd.type === BREADCRUMB_SCHEMA_TYPE)

  if (!hasBreadcrumbAria && !hasBreadcrumbSchema) {
    issues.push(
      'No breadcrumb navigation detected — consider adding breadcrumbs for hierarchical content'
    )
  }

  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'Navigation landmarks and breadcrumb navigation are present.',
      impact: 'medium',
      category: 'ux',
      machineTestable: true,
    }
  }

  // Missing nav landmark is the more critical issue.
  const isCritical = !hasNav

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: isCritical ? 'fail' : 'warn',
    score: isCritical ? 0 : 50,
    message: `${issues.length} navigation structure issue(s) detected.`,
    details: issues.join('; '),
    recommendation:
      'Add a <nav> element (or role="navigation") to identify navigation sections. ' +
      'For multi-level content, add breadcrumb navigation with aria-label="breadcrumb" ' +
      'or Schema.org BreadcrumbList structured data to help users understand their location.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'ux',
    machineTestable: true,
  }
}
