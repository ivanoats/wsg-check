/**
 * WSG 3.16 – Reducing Third-Party Dependencies
 *
 * Analyzes the number of external resources loaded by the page.  Each
 * external dependency adds network round-trips, increases attack surface,
 * and may introduce unpredictable payload sizes that the page author cannot
 * control — all of which are sustainability concerns.
 *
 * This check counts the total number of third-party resources (scripts,
 * stylesheets, images, fonts, media, and other) and the total number of
 * external script and stylesheet dependencies specifically, as these have
 * the greatest performance and security impact.
 *
 * Thresholds (total third-party resources):
 *   0         → pass  (100)
 *   1–9       → warn   (50)
 *   10+       → fail    (0)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#reducing-third-party-code
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '3.16'
const GUIDELINE_NAME = 'Reducing Third-Party Dependencies'
const SUCCESS_CRITERION = 'Pages should minimise third-party resource dependencies'
const RESOURCES = ['https://www.w3.org/TR/web-sustainability-guidelines/#reducing-third-party-code']

/** Maximum third-party resource count that results in a warn (values above this fail). */
const MAX_WARN_COUNT = 9

export const checkDependencyCount: CheckFn = (page) => {
  const { thirdPartyCount, byType } = page.pageWeight

  const thirdPartyScripts = Math.min(byType.script, thirdPartyCount)
  const thirdPartyStylesheets = Math.min(byType.stylesheet, thirdPartyCount)

  if (thirdPartyCount === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'No third-party resource dependencies detected.',
      impact: 'high',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  const breakdown: string[] = []
  if (thirdPartyScripts > 0) breakdown.push(`${thirdPartyScripts} script(s)`)
  if (thirdPartyStylesheets > 0) breakdown.push(`${thirdPartyStylesheets} stylesheet(s)`)
  const remainingCount = thirdPartyCount - thirdPartyScripts - thirdPartyStylesheets
  if (remainingCount > 0) breakdown.push(`${remainingCount} other resource(s)`)

  const breakdownStr = breakdown.length > 0 ? ` (${breakdown.join(', ')})` : ''

  if (thirdPartyCount > MAX_WARN_COUNT) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'fail',
      score: 0,
      message: `${thirdPartyCount} third-party resource(s) detected${breakdownStr}.`,
      details: `Third-party resources: ${thirdPartyCount} total${breakdownStr}`,
      recommendation:
        'Audit and reduce third-party dependencies. Self-host fonts, icons, and scripts ' +
        'instead of loading them from third-party CDNs. Remove analytics, social widgets, ' +
        'and tracking scripts that are not essential to the user experience. Each third-party ' +
        'resource adds a network round-trip and increases your attack surface.',
      resources: RESOURCES,
      impact: 'high',
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
    message: `${thirdPartyCount} third-party resource(s) detected${breakdownStr}.`,
    details: `Third-party resources: ${thirdPartyCount} total${breakdownStr}`,
    recommendation:
      'Review third-party dependencies and remove those that are not essential. ' +
      'Self-host fonts and icons where possible. Use a Content Security Policy to ' +
      'prevent unauthorised third-party resource injection.',
    resources: RESOURCES,
    impact: 'high',
    category: 'web-dev',
    machineTestable: true,
  }
}
