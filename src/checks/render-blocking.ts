/**
 * WSG 3.8 – Resolve Render Blocking Content
 *
 * Checks for two common sources of render-blocking behaviour:
 *
 *   1. External `<script>` elements without an `async` or `defer` attribute.
 *      These block the browser's HTML parser until the script has been
 *      downloaded, parsed, and executed, delaying the first paint and
 *      increasing time-to-interactive — both of which waste user energy.
 *
 *   2. `<img>` elements without `loading="lazy"`, which forces the browser to
 *      fetch all images immediately regardless of whether they are visible in
 *      the initial viewport.
 *
 * Scoring:
 *   - Render-blocking scripts present                  → fail  (0)
 *   - No blocking scripts, but images lack lazy-load   → warn (50)
 *   - All scripts deferred AND all images lazy-loaded  → pass (100)
 *   - No scripts and no images on the page             → not-applicable
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#resolve-render-blocking-content
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '3.8'
const GUIDELINE_NAME = 'Resolve Render Blocking Content'
const SUCCESS_CRITERION = 'Scripts should use async or defer; images should use loading="lazy"'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#resolve-render-blocking-content',
]

export const checkRenderBlocking: CheckFn = (page) => {
  const scripts = page.parsedPage.resources.filter((r) => r.type === 'script')
  const images = page.parsedPage.resources.filter((r) => r.type === 'image')

  if (scripts.length === 0 && images.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'not-applicable',
      score: 0,
      message: 'No external scripts or images found.',
      impact: 'high',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  // ── Render-blocking scripts ───────────────────────────────────────────────
  // A script is blocking when it has neither the `async` nor the `defer`
  // attribute.  Both attributes are boolean so they appear in `attributes`
  // with an empty-string value when present.
  const blockingScripts = scripts.filter(
    (s) => !('async' in s.attributes) && !('defer' in s.attributes)
  )

  if (blockingScripts.length > 0) {
    const urlList = blockingScripts.map((s) => s.url).join(', ')
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'fail',
      score: 0,
      message: `${blockingScripts.length} render-blocking script(s) found (missing async or defer).`,
      details: urlList,
      recommendation:
        'Add async or defer to all non-critical <script> tags. Use defer for scripts that depend on the DOM and async for fully independent scripts.',
      resources: RESOURCES,
      impact: 'high',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  // ── Images without lazy loading ───────────────────────────────────────────
  const nonLazyImages = images.filter((img) => img.attributes.loading !== 'lazy')

  if (images.length > 0 && nonLazyImages.length > 0) {
    const urlList = nonLazyImages.map((img) => img.url).join(', ')
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'warn',
      score: 50,
      message: `${nonLazyImages.length} of ${images.length} image(s) lack loading="lazy".`,
      details: urlList,
      recommendation:
        'Add loading="lazy" to images that are below the fold so that they are only fetched when they enter the viewport.',
      resources: RESOURCES,
      impact: 'medium',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  // ── All clear ─────────────────────────────────────────────────────────────
  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'pass',
    score: 100,
    message: 'All scripts use async or defer, and all images use loading="lazy".',
    impact: 'high',
    category: 'web-dev',
    machineTestable: true,
  }
}
