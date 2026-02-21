/**
 * WSG 2.11 – Avoid Bloated or Unnecessary Content
 *
 * Verifies that images below the initial viewport use the native lazy-loading
 * attribute to defer downloading until they are needed:
 *
 *   - `loading="lazy"` — instructs the browser to defer loading the image
 *     until it is near the viewport, reducing initial page weight and
 *     time-to-interactive for pages with many images.
 *
 * Heuristic:
 *   When a page has more than one image, at least some should use lazy loading
 *   to avoid downloading off-screen images on initial load.  If only one image
 *   is present it is likely the hero/LCP image and should NOT be lazy-loaded.
 *
 * Scoring:
 *   - 0 images                                         → not-applicable
 *   - 1 image (likely LCP — no lazy needed)            → pass (100)
 *   - 2+ images, none lazy-loaded                      → fail  (0)
 *   - 2+ images, some lazy-loaded but not all non-first → warn (50)
 *   - All images except possibly the first lazy-loaded → pass (100)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#avoid-bloated-or-unnecessary-content
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '2.11'
const GUIDELINE_NAME = 'Avoid Bloated or Unnecessary Content'
const SUCCESS_CRITERION =
  'Images below the fold should use loading="lazy" to defer unnecessary downloads'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#avoid-bloated-or-unnecessary-content',
]

export const checkLazyLoading: CheckFn = (page) => {
  // Only inspect primary image resources (those with an explicit src).
  const imageResources = page.parsedPage.resources.filter(
    (r) => r.type === 'image' && 'src' in r.attributes
  )

  if (imageResources.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'not-applicable',
      score: 0,
      message: 'No images found — lazy-loading check not applicable.',
      impact: 'medium',
      category: 'ux',
      machineTestable: true,
    }
  }

  // With a single image it is most likely the LCP/hero image — eager loading
  // is correct here.
  if (imageResources.length === 1) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'Only one image found — eager loading is appropriate for a likely hero image.',
      impact: 'medium',
      category: 'ux',
      machineTestable: true,
    }
  }

  const lazyImages = imageResources.filter((r) => r.attributes.loading === 'lazy')
  const lazyCount = lazyImages.length
  const total = imageResources.length

  // None lazy-loaded at all → fail
  if (lazyCount === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'fail',
      score: 0,
      message: `${total} image(s) found but none use loading="lazy".`,
      details:
        'All images will be downloaded on initial page load, even those that are off-screen.',
      recommendation:
        'Add loading="lazy" to all <img> elements except the first/hero image to defer ' +
        'downloading off-screen images until they are near the viewport.',
      resources: RESOURCES,
      impact: 'medium',
      category: 'ux',
      machineTestable: true,
    }
  }

  // At least the non-first images should be lazy.  Allow the first image to be
  // eager (LCP) and expect the rest to be lazy.
  const nonFirstImages = imageResources.slice(1)
  const allNonFirstAreLazy = nonFirstImages.every((r) => r.attributes.loading === 'lazy')

  if (allNonFirstAreLazy) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `${lazyCount} of ${total} image(s) use loading="lazy" (first image may be eager for LCP).`,
      impact: 'medium',
      category: 'ux',
      machineTestable: true,
    }
  }

  const missingLazy = total - lazyCount
  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'warn',
    score: 50,
    message: `${lazyCount} of ${total} image(s) use loading="lazy" — ${missingLazy} may be loading eagerly when off-screen.`,
    details:
      `${lazyCount} image(s) have loading="lazy"; ${missingLazy} do not. ` +
      'Consider adding lazy loading to all below-the-fold images.',
    recommendation:
      'Add loading="lazy" to all <img> elements that are not in the initial viewport. ' +
      'The first/hero image should remain eager-loaded for LCP performance.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'ux',
    machineTestable: true,
  }
}
