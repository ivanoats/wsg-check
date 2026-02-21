/**
 * WSG 3.15 – Code Security
 *
 * Checks that the page is served with the recommended HTTP security headers.
 * Security headers defend against common web attacks (XSS, clickjacking,
 * MIME-sniffing, etc.) while having no performance impact on the user.
 * From a sustainability perspective, compromised pages cause unnecessary
 * traffic (spam, malware distribution) and erode user trust, leading to
 * wasted navigations.
 *
 * Headers checked (all must be present for a pass):
 *   - `Content-Security-Policy` (CSP)
 *   - `Strict-Transport-Security` (HSTS)
 *   - `X-Frame-Options`
 *   - `X-Content-Type-Options`
 *   - `Referrer-Policy`
 *
 * Scoring:
 *   - All 5 headers present             → pass  (100)
 *   - 1–2 headers missing               → warn   (50)
 *   - 3+ headers missing                → fail    (0)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#code-security
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '3.15'
const GUIDELINE_NAME = 'Code Security'
const SUCCESS_CRITERION =
  'Pages should be served with key HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)'
const RESOURCES = ['https://www.w3.org/TR/web-sustainability-guidelines/#code-security']

/** Security headers to check, with human-readable labels. */
const SECURITY_HEADERS: { header: string; label: string }[] = [
  { header: 'content-security-policy', label: 'Content-Security-Policy' },
  { header: 'strict-transport-security', label: 'Strict-Transport-Security' },
  { header: 'x-frame-options', label: 'X-Frame-Options' },
  { header: 'x-content-type-options', label: 'X-Content-Type-Options' },
  { header: 'referrer-policy', label: 'Referrer-Policy' },
]

/** Number of missing headers at which the result escalates from warn to fail. */
const FAIL_THRESHOLD = 3

export const checkSecurityHeaders: CheckFn = (page) => {
  const headers = page.fetchResult.headers

  const missing = SECURITY_HEADERS.filter(({ header }) => !headers[header])

  if (missing.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'All recommended security headers are present.',
      impact: 'high',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  const missingList = missing.map((h) => h.label).join(', ')
  const isFail = missing.length >= FAIL_THRESHOLD

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: isFail ? 'fail' : 'warn',
    score: isFail ? 0 : 50,
    message: `${missing.length} security header(s) missing: ${missingList}.`,
    details: `Missing headers: ${missingList}`,
    recommendation:
      'Add the missing security headers to your server or CDN configuration. ' +
      'Content-Security-Policy restricts resource loading to prevent XSS. ' +
      'Strict-Transport-Security enforces HTTPS connections. ' +
      'X-Frame-Options prevents clickjacking. ' +
      'X-Content-Type-Options prevents MIME-sniffing. ' +
      'Referrer-Policy controls the Referer header sent with requests.',
    resources: RESOURCES,
    impact: 'high',
    category: 'web-dev',
    machineTestable: true,
  }
}
