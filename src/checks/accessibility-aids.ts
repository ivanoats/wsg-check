/**
 * WSG 3.9 – Provide Code-Based Way-Finding Mechanisms
 *
 * Checks for accessibility aids that allow users to navigate pages efficiently
 * without excessive interaction, reducing device and network energy use:
 *
 *   1. Skip navigation link — an `<a href="#…">` that allows keyboard and
 *      screen-reader users to bypass repeated navigation blocks.  Mandatory
 *      when a navigation landmark is present (WCAG 2.4.1 / WSG 3.9).
 *
 *   2. `<main>` landmark — identifies the primary content region so assistive
 *      technology users can jump directly to it.
 *
 * Scoring:
 *   - Navigation present, no skip link → fail  (0)
 *   - Missing <main> landmark only     → warn (50)
 *   - Both present                     → pass (100)
 *   - No navigation structure at all   → not-applicable
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#provide-code-based-way-finding
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '3.9'
const GUIDELINE_NAME = 'Provide Code-Based Way-Finding Mechanisms'
const SUCCESS_CRITERION =
  'Pages with navigation should include a skip navigation link and a <main> landmark'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#provide-code-based-way-finding',
]

export const checkAccessibilityAids: CheckFn = (page) => {
  const { hasSkipLink, landmarks } = page.parsedPage

  const hasNav = landmarks.includes('nav') || landmarks.includes('navigation')
  const hasMain = landmarks.includes('main')

  // If the page has no navigation structure at all, this check is not applicable.
  if (!hasNav && !hasMain && !hasSkipLink) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'not-applicable',
      score: 0,
      message: 'No navigation landmarks detected — way-finding check not applicable.',
      impact: 'medium',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  const issues: string[] = []

  if (!hasMain) {
    issues.push(
      'No <main> landmark element found — primary content is not programmatically identified'
    )
  }

  if (hasNav && !hasSkipLink) {
    issues.push('Navigation landmark present but no skip navigation link detected')
  }

  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'Page has a skip navigation link and a <main> landmark.',
      impact: 'medium',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  // Missing skip link when nav is present is the more severe failure — it
  // forces keyboard/screen-reader users to tab through the entire navigation
  // on every page load, wasting time and energy.
  const isCritical = hasNav && !hasSkipLink

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: isCritical ? 'fail' : 'warn',
    score: isCritical ? 0 : 50,
    message: `${issues.length} way-finding issue(s) found.`,
    details: issues.join('; '),
    recommendation:
      'Add a visually hidden skip navigation link (e.g. <a class="skip-link" href="#main-content">Skip to main content</a>) as the first focusable element on the page, and wrap the primary content in a <main> element.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
  }
}
