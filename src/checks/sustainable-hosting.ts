/**
 * WSG 4.1 – Choose a Sustainable Hosting Provider
 *
 * Queries the Green Web Foundation dataset (via CO2.js `hosting.check`) to
 * determine whether the target domain is served from infrastructure that runs
 * on verified renewable energy.  A green hosting provider directly reduces
 * the carbon intensity of every byte delivered to users.
 *
 * Scoring:
 *   - Domain found in Green Web Foundation dataset  → pass  (100)
 *   - Domain NOT found                              → fail    (0)
 *
 * Note: The check is asynchronous and swallows network errors from the Green
 * Web Foundation API (a transient failure returns `fail` with a message
 * indicating the check could not be completed).
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#choose-a-sustainable-hosting-provider
 */

import type { CheckFn } from '../core/types.js'
import { checkGreenHosting } from '../utils/carbon-estimator.js'

const GUIDELINE_ID = '4.1'
const GUIDELINE_NAME = 'Choose a Sustainable Hosting Provider'
const SUCCESS_CRITERION =
  'The domain should be served from infrastructure powered by verified renewable energy'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#choose-a-sustainable-hosting-provider',
  'https://www.thegreenwebfoundation.org/',
]

export const checkSustainableHosting: CheckFn = async (page) => {
  const domain = new URL(page.url).hostname

  const isGreen = await checkGreenHosting(domain)

  if (isGreen) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `${domain} is hosted on verified renewable-energy infrastructure (Green Web Foundation).`,
      impact: 'high',
      category: 'hosting',
      machineTestable: true,
    }
  }

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'fail',
    score: 0,
    message: `${domain} is not listed in the Green Web Foundation dataset as a green hosting provider.`,
    details:
      'The Green Web Foundation maintains a dataset of hosting providers that run on renewable energy. ' +
      'This domain was not found in that dataset.',
    recommendation:
      'Consider migrating to a hosting provider that uses 100% renewable energy and is ' +
      'verified by the Green Web Foundation. Check https://www.thegreenwebfoundation.org/green-web-check/ ' +
      'to explore certified green providers.',
    resources: RESOURCES,
    impact: 'high',
    category: 'hosting',
    machineTestable: true,
  }
}
