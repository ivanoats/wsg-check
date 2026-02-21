/**
 * WSG 4.4 – Create a Performant 404 Page
 *
 * Checks that the server has a functional error-page mechanism by examining
 * whether the currently fetched page returned an expected 200 OK status code.
 * A non-200 response for the canonical URL suggests a configuration problem
 * that should be investigated.
 *
 * Static analysis limitation: verifying that a custom 404 page is served for
 * truly non-existent paths requires an additional HTTP request to a deliberate
 * "not found" URL, which is outside the scope of the single-page analysis
 * performed by wsg-check.  This check therefore returns `info` to flag the
 * manual step that should be performed.
 *
 * What this check can determine:
 *   - Whether the requested URL returned an HTTP 200 status.
 *   - If a non-200 status is received, the check fails with details.
 *
 * Scoring:
 *   - Status 200                               → info (manual verification needed)
 *   - Status other than 200 (e.g. 404 for main page, 5xx) → fail (0)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#create-a-performant-404-page
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '4.4'
const GUIDELINE_NAME = 'Create a Performant 404 Page'
const SUCCESS_CRITERION =
  'The server should serve a lightweight, helpful custom 404 page for non-existent URLs'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#create-a-performant-404-page',
]

export const checkErrorPages: CheckFn = (page) => {
  const { statusCode } = page.fetchResult

  if (statusCode !== 200) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'fail',
      score: 0,
      message: `Unexpected HTTP status ${statusCode} for the requested URL.`,
      details: `Expected HTTP 200 but received ${statusCode}. This may indicate a misconfigured server or missing resource.`,
      recommendation:
        'Ensure the canonical URL returns HTTP 200. Additionally, verify that non-existent ' +
        'paths return a lightweight custom 404 page (not the full-weight homepage) by manually ' +
        'requesting a deliberately invalid URL such as /this-page-does-not-exist.',
      resources: RESOURCES,
      impact: 'medium',
      category: 'hosting',
      machineTestable: false,
    }
  }

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'info',
    score: 0,
    message:
      'Page returned HTTP 200. Manual verification required: request a non-existent URL to confirm a custom 404 page is served.',
    details:
      'Static analysis cannot verify that non-existent paths return a proper 404 status ' +
      'with a lightweight, helpful error page. This requires a live HTTP request to a ' +
      'deliberately invalid URL.',
    recommendation:
      'Manually test your 404 page by navigating to a non-existent path (e.g. /this-page-does-not-exist). ' +
      'Ensure the response returns HTTP 404 (not 200) and that the page is lightweight, ' +
      'branded, and provides helpful navigation back to existing content.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'hosting',
    machineTestable: false,
  }
}
