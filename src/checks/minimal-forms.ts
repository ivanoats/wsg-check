/**
 * WSG 2.19 – Support Native User Interface Features (minimal forms check)
 *
 * Audits form design for sustainability and accessibility:
 *
 *   1. Form field count — forms with many fields increase cognitive load and
 *      the chance of submission errors, leading to repeat submissions.
 *      A warning is raised when more than 7 fields are present; more than
 *      12 fields is considered excessive.
 *
 *   2. `autocomplete` — allows browsers and password managers to pre-fill
 *      fields, reducing keystrokes and submission errors.
 *
 *   3. `inputmode` — hints the browser to show the most appropriate virtual
 *      keyboard (e.g. `inputmode="email"` shows an email-optimised keyboard
 *      on mobile), reducing typing effort.
 *
 * Scoring:
 *   - No form inputs                        → not-applicable
 *   - Excessive fields or no autocomplete   → fail (0)
 *   - Some issues                           → warn (50)
 *   - All signals present                   → pass (100)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#support-native-user-interface-features
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '2.19'
const GUIDELINE_NAME = 'Support Native User Interface Features'
const SUCCESS_CRITERION =
  'Forms should be minimal, use autocomplete, and apply inputmode for mobile-friendly input'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#support-native-user-interface-features',
]

/** Warn threshold for form field count. */
const FIELD_COUNT_WARN = 7
/** Fail threshold for form field count. */
const FIELD_COUNT_FAIL = 12

export const checkMinimalForms: CheckFn = (page) => {
  const { formInputs } = page.parsedPage

  if (formInputs.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'not-applicable',
      score: 0,
      message: 'No form inputs found — minimal forms check not applicable.',
      impact: 'low',
      category: 'ux',
      machineTestable: true,
    }
  }

  const issues: string[] = []
  let status: 'pass' | 'warn' | 'fail' = 'pass'
  let score = 100

  // ── 1. Field count ────────────────────────────────────────────────────────
  if (formInputs.length > FIELD_COUNT_FAIL) {
    status = 'fail'
    score = 0
    issues.push(
      `${formInputs.length} form field(s) detected (budget: ${FIELD_COUNT_FAIL}) — ` +
        'excessive fields increase cognitive load and submission errors'
    )
  } else if (formInputs.length > FIELD_COUNT_WARN) {
    if (status === 'pass') {
      status = 'warn'
      score = 50
    }
    issues.push(
      `${formInputs.length} form field(s) detected (consider reducing to ${FIELD_COUNT_WARN} or fewer)`
    )
  }

  // ── 2. autocomplete ───────────────────────────────────────────────────────
  const withAutocomplete = formInputs.filter((i) => i.hasAutocomplete).length
  if (withAutocomplete === 0) {
    if (status === 'pass') {
      status = 'fail'
      score = 0
    }
    issues.push(
      `None of the ${formInputs.length} input(s) use the autocomplete attribute — ` +
        'autocomplete reduces user effort and submission errors'
    )
  }

  // ── 3. inputmode ──────────────────────────────────────────────────────────
  const withInputmode = formInputs.filter((i) => i.hasInputmode).length
  if (withInputmode === 0) {
    if (status === 'pass') {
      status = 'warn'
      score = 50
    }
    issues.push(
      `None of the ${formInputs.length} input(s) use the inputmode attribute — ` +
        'inputmode hints the browser to show the most appropriate virtual keyboard on mobile'
    )
  }

  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `Form looks well-optimised: ${formInputs.length} field(s) with autocomplete and inputmode.`,
      impact: 'low',
      category: 'ux',
      machineTestable: true,
    }
  }

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status,
    score,
    message: 'Form optimisation issues detected.',
    details: issues.join('; '),
    recommendation:
      'Reduce form fields to only those strictly necessary. Add autocomplete attributes ' +
      '(e.g. autocomplete="email") so browsers can pre-fill fields. Use inputmode ' +
      '(e.g. inputmode="email", inputmode="tel", inputmode="numeric") to trigger the ' +
      'correct virtual keyboard on mobile devices, reducing user typing effort.',
    resources: RESOURCES,
    impact: 'low',
    category: 'ux',
    machineTestable: true,
  }
}
