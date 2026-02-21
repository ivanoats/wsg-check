/**
 * WSG 2.15 – Use Animations Responsibly
 *
 * Detects CSS animation declarations in inline `<style>` blocks that are not
 * guarded by a `prefers-reduced-motion` media query:
 *
 *   - Animations can cause vestibular and cognitive issues for users with
 *     motion sensitivities.
 *   - Unguarded animations also consume CPU/GPU resources continuously,
 *     increasing device energy use.
 *   - The `prefers-reduced-motion: reduce` media query lets the browser
 *     honour the user's system-level motion preference.
 *
 * Detection approach:
 *   1. Scan inline `<style>` blocks for `@keyframes` or `animation:` /
 *      `transition:` declarations (signals the use of CSS animation).
 *   2. Check whether `prefers-reduced-motion` also appears in the same
 *      inline CSS (signals the animation is guarded).
 *
 * Limitation: external stylesheets are not fetched, so a guard living only
 * in a linked stylesheet will not be detected.
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#use-animations-responsibly
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '2.15'
const GUIDELINE_NAME = 'Use Animations Responsibly'
const SUCCESS_CRITERION =
  'CSS animations should be guarded with a prefers-reduced-motion media query'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#use-animations-responsibly',
]

/** Matches `<style …> … </style>` blocks (case-insensitive). */
const STYLE_BLOCK_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gi

/** CSS animation signals. */
const ANIMATION_PATTERN = /@keyframes\b|animation\s*:|transition\s*:/i

/** Signal that the developer is honouring prefers-reduced-motion. */
const REDUCED_MOTION_PATTERN = /prefers-reduced-motion/i

/**
 * Extract all inline `<style>` block contents from raw HTML.
 */
function extractStyleBlocks(body: string): string {
  const contents: string[] = []
  const regex = new RegExp(STYLE_BLOCK_PATTERN.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = regex.exec(body)) !== null) {
    contents.push(match[1])
  }
  return contents.join('\n')
}

export const checkAnimationControl: CheckFn = (page) => {
  const inlineCss = extractStyleBlocks(page.fetchResult.body)

  const hasAnimations = ANIMATION_PATTERN.test(inlineCss)

  if (!hasAnimations) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'not-applicable',
      score: 0,
      message: 'No CSS animations detected in inline styles — check not applicable.',
      impact: 'medium',
      category: 'ux',
      machineTestable: true,
    }
  }

  const hasReducedMotionGuard = REDUCED_MOTION_PATTERN.test(inlineCss)

  if (hasReducedMotionGuard) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message:
        'CSS animations detected and a prefers-reduced-motion media query is present in inline styles.',
      impact: 'medium',
      category: 'ux',
      machineTestable: true,
    }
  }

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'fail',
    score: 0,
    message: 'CSS animations detected in inline styles without a prefers-reduced-motion guard.',
    details:
      '@keyframes or animation/transition declarations found but no prefers-reduced-motion ' +
      'media query detected in inline CSS. Note: external stylesheets are not analysed.',
    recommendation:
      'Wrap animation declarations in a @media (prefers-reduced-motion: no-preference) block ' +
      'and provide a minimal or no-animation alternative inside ' +
      "@media (prefers-reduced-motion: reduce). This respects users' system motion preferences " +
      'and reduces CPU/GPU energy consumption.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'ux',
    machineTestable: true,
  }
}
