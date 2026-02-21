/**
 * WSG 2.10 – Avoid Manipulative Patterns
 *
 * Detects common dark-pattern indicators that manipulate users into actions
 * against their interests, wasting their time and device energy:
 *
 *   1. Hidden close buttons — modal or dialog close controls with
 *      `display:none` or `visibility:hidden` inline styles trap users in
 *      an overlay, forcing unnecessary interactions.
 *
 *   2. Countdown timers — elements with class names like `countdown`,
 *      `count-down`, or `timer` create artificial urgency that pressures
 *      users into hasty decisions, discouraging deliberate browsing.
 *
 * Detection approach:
 *   Heuristic pattern matching against raw HTML.  Results may include false
 *   positives (e.g. a legitimate countdown to an event) and should be
 *   reviewed manually.
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#avoid-manipulative-patterns
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '2.10'
const GUIDELINE_NAME = 'Avoid Manipulative Patterns'
const SUCCESS_CRITERION =
  'Pages should not use dark patterns such as hidden close buttons or countdown timers'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#avoid-manipulative-patterns',
]

/**
 * Matches an element with a "close" class whose opening tag also contains an
 * inline style that hides the element (display:none or visibility:hidden).
 * Uses lookaheads so attribute order (class vs style) does not matter.
 */
const HIDDEN_CLOSE_PATTERN =
  /<[^>]*(?=[^>]*class=["'][^"']*\bclose\b[^"']*["'])(?=[^>]*style=["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden)[^"']*["'])[^>]*>/i

/** Matches elements with common countdown-timer class names. */
const COUNTDOWN_PATTERN = /class=["'][^"']*\b(?:countdown|count-down|timer)\b[^"']*["']/i

export const checkDeceptivePatterns: CheckFn = (page) => {
  const body = page.fetchResult.body
  const issues: string[] = []

  // ── Hidden close buttons ──────────────────────────────────────────────────
  if (HIDDEN_CLOSE_PATTERN.test(body)) {
    issues.push(
      'Potential hidden close button detected — ensure dialogs and overlays have visible dismiss controls'
    )
  }

  // ── Countdown timers ──────────────────────────────────────────────────────
  if (COUNTDOWN_PATTERN.test(body)) {
    issues.push(
      'Countdown timer element detected — artificial urgency patterns discourage deliberate decision-making'
    )
  }

  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'No common deceptive design pattern indicators detected.',
      impact: 'medium',
      category: 'ux',
      machineTestable: true,
    }
  }

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'warn',
    score: 50,
    message: `${issues.length} potential deceptive design pattern indicator(s) detected.`,
    details: issues.join('; ') + ' Note: heuristic detection — manual review recommended.',
    recommendation:
      'Review flagged patterns manually. Ensure all modal close buttons are visible and ' +
      'keyboard-accessible. Avoid countdown timers that create artificial scarcity or urgency. ' +
      'Use honest design that respects user autonomy.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'ux',
    machineTestable: true,
  }
}
