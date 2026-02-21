/**
 * WSG 3.1 – Set Performance Budgets
 *
 * Checks the page's HTML document size and total referenced resource count
 * against sustainability-driven performance budgets.  Reducing page weight
 * directly reduces the energy consumed to transfer and render the page.
 *
 * Static analysis only: external resource sizes are not fetched individually,
 * so `htmlSize` (the HTML response body in bytes) is the primary weight signal
 * and `resourceCount` (total referenced external assets) is a secondary signal.
 *
 * Thresholds:
 *   htmlSize  > 500 KB → fail   (0)
 *   htmlSize  > 100 KB → warn  (50)
 *   resources > 100    → fail   (0)
 *   resources > 50     → warn  (50)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#performance-goals
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '3.1'
const GUIDELINE_NAME = 'Set Performance Budgets'
const SUCCESS_CRITERION =
  'HTML document size and resource count should be within performance budgets'
const RESOURCES = ['https://www.w3.org/TR/web-sustainability-guidelines/#performance-goals']

/** Byte thresholds for the HTML response body. */
const HTML_WARN_BYTES = 100 * 1024 // 100 KB
const HTML_FAIL_BYTES = 500 * 1024 // 500 KB

/** Thresholds for total referenced external resource count. */
const RESOURCE_WARN = 50
const RESOURCE_FAIL = 100

export const checkPageWeight: CheckFn = (page) => {
  const { htmlSize, resourceCount } = page.pageWeight
  const issues: string[] = []

  let status: 'pass' | 'warn' | 'fail' = 'pass'
  let score = 100

  const htmlKb = Math.round(htmlSize / 1024)

  if (htmlSize > HTML_FAIL_BYTES) {
    status = 'fail'
    score = 0
    issues.push(`HTML document is ${htmlKb} KB (budget: ${HTML_FAIL_BYTES / 1024} KB)`)
  } else if (htmlSize > HTML_WARN_BYTES) {
    status = 'warn'
    score = 50
    issues.push(`HTML document is ${htmlKb} KB (budget: ${HTML_WARN_BYTES / 1024} KB)`)
  }

  if (resourceCount > RESOURCE_FAIL) {
    if (status !== 'fail') {
      status = 'fail'
      score = 0
    }
    issues.push(`${resourceCount} external resources referenced (budget: ${RESOURCE_FAIL})`)
  } else if (resourceCount > RESOURCE_WARN) {
    if (status === 'pass') {
      status = 'warn'
      score = 50
    }
    issues.push(`${resourceCount} external resources referenced (budget: ${RESOURCE_WARN})`)
  }

  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `HTML is ${htmlKb} KB with ${resourceCount} external resource(s) — within budget.`,
      impact: 'medium',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status,
    score,
    message: 'Page weight exceeds sustainability budget.',
    details: issues.join('; '),
    recommendation:
      'Reduce HTML document size by removing unnecessary markup, inlined content, and redundant code. Reduce external resource references by bundling assets and removing unused scripts and stylesheets.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
  }
}
