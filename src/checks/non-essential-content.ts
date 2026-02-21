/**
 * WSG 2.9 – Respect the Visitor's Attention
 *
 * Detects non-essential content patterns that waste bandwidth, consume user
 * attention, and increase device energy use:
 *
 *   1. Auto-playing media — `<video autoplay>` or `<audio autoplay>` elements
 *      start consuming bandwidth and CPU immediately without user consent.
 *
 *   2. Modals and popups — intrusive overlay patterns (modal, popup, lightbox,
 *      dialog) disrupt the user journey and often cause unnecessary re-loads
 *      when users dismiss and navigate away.
 *
 * Detection approach:
 *   - Scan the raw HTML body for autoplay attributes on media elements.
 *   - Scan the raw HTML body for common modal/popup class-name patterns.
 *
 * Limitation: JavaScript-injected modals and programmatically triggered
 * autoplay are not detectable from static HTML analysis.
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#respect-the-visitors-attention
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '2.9'
const GUIDELINE_NAME = "Respect the Visitor's Attention"
const SUCCESS_CRITERION = 'Avoid auto-playing media and intrusive modal or popup overlays'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#respect-the-visitors-attention',
]

/** Matches <video> or <audio> elements that carry the `autoplay` attribute. */
const AUTOPLAY_PATTERN = /<(?:video|audio)\b[^>]*\bautoplay\b/i

/** Matches common modal/popup class-name patterns. */
const MODAL_PATTERN =
  /class=["'][^"']*\b(?:modal|popup|pop-up|lightbox|overlay|dialog)\b[^"']*["']/i

export const checkNonEssentialContent: CheckFn = (page) => {
  const body = page.fetchResult.body
  const issues: string[] = []

  // ── Auto-playing media ────────────────────────────────────────────────────
  if (AUTOPLAY_PATTERN.test(body)) {
    issues.push(
      'Auto-playing media element(s) detected — auto-play wastes bandwidth and disrupts users'
    )
  }

  // ── Modals and popups ─────────────────────────────────────────────────────
  if (MODAL_PATTERN.test(body)) {
    issues.push(
      'Potential modal or popup content detected — use sparingly and ensure they are dismissible'
    )
  }

  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'No auto-playing media or intrusive modal/popup patterns detected.',
      impact: 'medium',
      category: 'ux',
      machineTestable: true,
    }
  }

  // Auto-playing media is the more critical issue — it actively consumes
  // bandwidth and CPU without user consent.
  const isCritical = AUTOPLAY_PATTERN.test(body)

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: isCritical ? 'fail' : 'warn',
    score: isCritical ? 0 : 50,
    message: `${issues.length} non-essential content issue(s) detected.`,
    details: issues.join('; '),
    recommendation:
      'Remove autoplay from media elements or add the muted and controls attributes so users opt in to playback. Minimise modals and pop-ups; ensure they are easily dismissible and do not appear unexpectedly.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'ux',
    machineTestable: true,
  }
}
