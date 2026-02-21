/**
 * WSG 2.17 – Provide Suitable Alternatives to Web Assets (alt text check)
 *
 * Verifies that all `<img>` elements have a meaningful `alt` attribute,
 * providing a text alternative for users who cannot see the image:
 *
 *   - Missing `alt` attribute — screen readers announce the image URL,
 *     which is meaningless and wastes user time.
 *   - Empty `alt=""` — acceptable for decorative images; treated as a pass.
 *   - Non-empty `alt` text — correct for content images.
 *
 * Scoring:
 *   - No images                                  → not-applicable
 *   - Any image missing the alt attribute        → fail  (0)
 *   - All images have alt (empty or non-empty)   → pass (100)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#provide-suitable-alternatives
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '2.17'
const GUIDELINE_NAME = 'Provide Suitable Alternatives to Web Assets'
const SUCCESS_CRITERION = 'All <img> elements must have an alt attribute'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#provide-suitable-alternatives',
]

export const checkAltText: CheckFn = (page) => {
  // Only inspect primary image resources (those with an explicit src attribute).
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
      message: 'No images found — alt text check not applicable.',
      impact: 'high',
      category: 'ux',
      machineTestable: true,
    }
  }

  const missingAlt = imageResources.filter((r) => !('alt' in r.attributes))
  const missingCount = missingAlt.length

  if (missingCount === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `All ${imageResources.length} image(s) have an alt attribute.`,
      impact: 'high',
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
    message: `${missingCount} of ${imageResources.length} image(s) are missing an alt attribute.`,
    details:
      `${missingCount} image(s) have no alt attribute. Missing alt text prevents screen-reader ` +
      'users from understanding image content and fails WCAG 2.1 Success Criterion 1.1.1.',
    recommendation:
      'Add an alt attribute to every <img> element. Use descriptive text for content images ' +
      '(e.g. alt="A bar chart showing carbon emissions by sector") and an empty alt="" for ' +
      'decorative images so screen readers skip them.',
    resources: RESOURCES,
    impact: 'high',
    category: 'ux',
    machineTestable: true,
  }
}
