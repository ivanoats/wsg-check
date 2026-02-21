/**
 * WSG 3.6 – Third-Party Assessment
 *
 * Counts and assesses third-party scripts and resources loaded by the page.
 * Third-party scripts are the single biggest sustainability risk from a web
 * performance perspective: each one adds a network round-trip, may set
 * tracking cookies, and often loads additional sub-resources the page author
 * cannot control.
 *
 * Thresholds (third-party scripts specifically):
 *   0         → pass  (100)
 *   1–5       → warn   (50)
 *   6+        → fail    (0)
 *
 * Note: resource classification uses a simplified eTLD+1 heuristic (last two
 * domain labels) rather than the full Public Suffix List.  This may give
 * slightly different results than the `pageWeight.thirdPartyCount` metric,
 * which uses PSL-based domain comparison, but is sufficient for a signal-level
 * check that focuses on third-party scripts.
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#third-party-assessment
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '3.6'
const GUIDELINE_NAME = 'Third-Party Assessment'
const SUCCESS_CRITERION = 'Third-party scripts and resources should be kept to a minimum'
const RESOURCES = ['https://www.w3.org/TR/web-sustainability-guidelines/#third-party-assessment']

/** Warn when third-party script count is above zero but within this value. */
const SCRIPT_WARN_THRESHOLD = 5

/**
 * Return the effective eTLD+1 for a URL using a simplified heuristic
 * (last two dot-separated labels of the hostname).
 */
function getEffectiveDomain(url: string): string {
  try {
    const parts = new URL(url).hostname.split('.')
    return parts.length >= 2 ? parts.slice(-2).join('.') : parts.join('.')
  } catch {
    return url
  }
}

export const checkThirdParty: CheckFn = (page) => {
  const pageDomain = getEffectiveDomain(page.url)

  const scripts = page.parsedPage.resources.filter((r) => r.type === 'script')
  const allResources = page.parsedPage.resources

  const thirdPartyScripts = scripts.filter((r) => getEffectiveDomain(r.url) !== pageDomain)
  const thirdPartyTotal = allResources.filter(
    (r) => getEffectiveDomain(r.url) !== pageDomain
  ).length

  const tpScriptCount = thirdPartyScripts.length

  // ── No third-party scripts ────────────────────────────────────────────────
  if (tpScriptCount === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `No third-party scripts found (${thirdPartyTotal} third-party resource(s) total).`,
      impact: 'high',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  const scriptUrlList = thirdPartyScripts.map((s) => s.url).join(', ')

  // ── Fail (6+ third-party scripts) ────────────────────────────────────────
  if (tpScriptCount > SCRIPT_WARN_THRESHOLD) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'fail',
      score: 0,
      message: `${tpScriptCount} third-party script(s) detected (${thirdPartyTotal} third-party resource(s) total).`,
      details: scriptUrlList,
      recommendation:
        'Audit every third-party script: remove analytics, social widgets, and advertising' +
        ' scripts that are not essential to the user experience. Self-host fonts and icons' +
        ' rather than loading them from third-party CDNs. Use a Content Security Policy to' +
        ' prevent unauthorised third-party resource injection.',
      resources: RESOURCES,
      impact: 'high',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  // ── Warn (1–5 third-party scripts) ───────────────────────────────────────
  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'warn',
    score: 50,
    message: `${tpScriptCount} third-party script(s) detected (${thirdPartyTotal} third-party resource(s) total).`,
    details: scriptUrlList,
    recommendation:
      'Review each third-party script and remove those that are not essential.' +
      ' Consider self-hosting fonts and icons. Use a facade pattern (load on interaction)' +
      ' for embeds such as videos or chat widgets to defer their cost until needed.',
    resources: RESOURCES,
    impact: 'high',
    category: 'web-dev',
    machineTestable: true,
  }
}
