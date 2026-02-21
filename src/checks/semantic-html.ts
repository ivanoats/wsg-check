/**
 * WSG 3.7 – Use HTML Elements Correctly
 *
 * Validates semantic HTML usage across three areas:
 *
 *   1. Document language — the `<html>` element should declare a `lang`
 *      attribute so screen readers and translation services work correctly.
 *
 *   2. Heading hierarchy — headings should form a logical outline.  Each
 *      level should increase by at most one step at a time (no skipped
 *      levels), and the page should contain exactly one `<h1>`.
 *
 *   3. Native elements over custom implementations — using `<div role="button">`
 *      or `<span role="checkbox">` instead of native `<button>` / `<input>`
 *      elements forces browsers to ship extra CSS/JS and harms accessibility.
 *      This check detects the most common patterns.
 *
 * Scoring:
 *   - Any issue found → warn (50)
 *   - No issues       → pass (100)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#use-html-elements-correctly
 */

import type { CheckFn } from '../core/types.js'
import type { HeadingNode } from '../utils/html-parser.js'

const GUIDELINE_ID = '3.7'
const GUIDELINE_NAME = 'Use HTML Elements Correctly'
const SUCCESS_CRITERION =
  'Use semantic HTML elements to structure content and reduce reliance on CSS/JS workarounds'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#use-html-elements-correctly',
]

/**
 * Matches `<div>` or `<span>` elements that carry a role attribute normally
 * satisfied by a native HTML element (button, checkbox, link, tab, etc.).
 * These indicate a custom-element re-implementation where a native element
 * would be lighter and more accessible.
 */
const CUSTOM_NATIVE_PATTERN =
  /<(?:div|span)\b[^>]*\brole=["'](?:button|checkbox|link|tab|menuitem|option|radio|switch)["'][^>]*/gi

/**
 * Return a list of heading-level skip violations in document order.
 * E.g. `h1` immediately followed by `h3` (skipping `h2`) → `["h1 → h3"]`.
 */
function findHeadingSkips(headings: HeadingNode[]): string[] {
  const violations: string[] = []
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1].level
    const curr = headings[i].level
    if (curr > prev + 1) {
      violations.push(`h${prev} → h${curr}`)
    }
  }
  return violations
}

export const checkSemanticHtml: CheckFn = (page) => {
  const { headings, lang, landmarks } = page.parsedPage
  const body = page.fetchResult.body
  const issues: string[] = []

  // ── Document language ─────────────────────────────────────────────────────
  if (!lang) {
    issues.push('The <html> element is missing a lang attribute')
  }

  // ── Heading hierarchy ─────────────────────────────────────────────────────
  if (headings.length > 0) {
    const h1Count = headings.filter((h) => h.level === 1).length
    if (h1Count === 0) {
      issues.push('No <h1> heading found on the page')
    } else if (h1Count > 1) {
      issues.push(`${h1Count} <h1> elements found — a page should have exactly one`)
    }
    const skips = findHeadingSkips(headings)
    if (skips.length > 0) {
      issues.push(`Heading levels are skipped: ${skips.join(', ')}`)
    }
  }

  // ── Main landmark ─────────────────────────────────────────────────────────
  if (!landmarks.includes('main')) {
    issues.push('No <main> landmark element found — primary content is not identified')
  }

  // ── Custom implementations of native HTML elements ────────────────────────
  const customNativeMatches = body.match(CUSTOM_NATIVE_PATTERN) ?? []
  if (customNativeMatches.length > 0) {
    issues.push(
      `${customNativeMatches.length} custom implementation(s) of native HTML elements detected` +
        ` (e.g. <div role="button">) — use native <button>, <a>, or <input> instead`
    )
  }

  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message:
        'Semantic HTML structure is correct (lang declared, heading hierarchy valid, native elements used).',
      impact: 'medium',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'warn',
    score: 50,
    message: `${issues.length} semantic HTML issue(s) found.`,
    details: issues.join('; '),
    recommendation:
      'Declare a lang attribute on <html>, use a single <h1> with no skipped heading levels, include a <main> element for primary content, and replace <div role="button"> patterns with native <button> or <a> elements.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
  }
}
