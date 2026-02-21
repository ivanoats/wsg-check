/**
 * WSG 3.12 – Validate Forms
 *
 * Checks that forms are accessible and use native HTML features that reduce
 * user effort and unnecessary round-trips caused by failed submissions:
 *
 *   1. Labels — every interactive input (`<input>`, `<select>`, `<textarea>`)
 *      must have an associated `<label>` element (via `for`/`id` pairing or
 *      nesting).  Missing labels cause errors for screen-reader users and lead
 *      to more failed form submissions.
 *
 *   2. Autocomplete — inputs should carry an `autocomplete` attribute to
 *      allow browsers and password managers to pre-fill fields, reducing the
 *      number of keystrokes and the chance of user error.
 *
 * Scoring:
 *   - Any unlabelled inputs present → fail  (0)
 *   - Labels OK, autocomplete absent → warn (50)
 *   - All inputs labelled and using autocomplete → pass (100)
 *   - No form inputs found → not-applicable
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#validate-forms
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '3.12'
const GUIDELINE_NAME = 'Validate Forms'
const SUCCESS_CRITERION = 'Form inputs must have labels; use autocomplete to reduce user effort'
const RESOURCES = ['https://www.w3.org/TR/web-sustainability-guidelines/#validate-forms']

export const checkFormValidation: CheckFn = (page) => {
  const { formInputs } = page.parsedPage

  if (formInputs.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'not-applicable',
      score: 0,
      message: 'No form inputs found.',
      impact: 'medium',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  const unlabelledInputs = formInputs.filter((i) => !i.hasLabel)
  const inputsWithAutocomplete = formInputs.filter((i) => i.hasAutocomplete)
  const issues: string[] = []

  if (unlabelledInputs.length > 0) {
    issues.push(
      `${unlabelledInputs.length} of ${formInputs.length} input(s) lack an associated label`
    )
  }

  if (inputsWithAutocomplete.length === 0) {
    issues.push(`None of the ${formInputs.length} input(s) use the autocomplete attribute`)
  }

  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `All ${formInputs.length} input(s) are labelled and use autocomplete.`,
      impact: 'medium',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  // Unlabelled inputs are a hard accessibility failure and the primary
  // source of unnecessary form re-submissions.
  const hasCriticalIssues = unlabelledInputs.length > 0

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: hasCriticalIssues ? 'fail' : 'warn',
    score: hasCriticalIssues ? 0 : 50,
    message: 'Form validation issues found.',
    details: issues.join('; '),
    recommendation:
      'Associate every input with a visible <label> using for/id pairing or by nesting the input inside the <label>. Add autocomplete attributes (e.g. autocomplete="email") to allow browsers and password managers to pre-fill fields.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
  }
}
