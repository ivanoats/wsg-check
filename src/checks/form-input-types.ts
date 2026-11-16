/**
 * Which form controls the `autocomplete` and `inputmode` attributes apply to.
 *
 * The HTML spec gives `autocomplete` no effect on checkbox, radio, file, button,
 * submit, reset, or image inputs, so asking for it there is a false positive
 * (a theme switcher built from radio buttons, for example). `inputmode` only
 * matters for free-text controls: `type="email"`, `"tel"`, `"url"`, and
 * `"number"` already choose a keyboard, and choice controls show none.
 *
 * Used by the form-validation (WSG 3.12) and minimal-forms (WSG 2.19) checks.
 *
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill
 * @see https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute
 */

import type { FormInputInfo } from '../utils/html-parser'

const AUTOCOMPLETE_TYPES: ReadonlySet<string> = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'number',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
  'range',
  'color',
  'select',
  'textarea',
])

const INPUTMODE_TYPES: ReadonlySet<string> = new Set(['text', 'search', 'textarea'])

/** Inputs where an `autocomplete` attribute has an effect. */
export const autocompleteCandidates = (inputs: readonly FormInputInfo[]): FormInputInfo[] =>
  inputs.filter((i) => AUTOCOMPLETE_TYPES.has(i.type.toLowerCase()))

/** Inputs where an `inputmode` attribute changes the on-screen keyboard. */
export const inputmodeCandidates = (inputs: readonly FormInputInfo[]): FormInputInfo[] =>
  inputs.filter((i) => INPUTMODE_TYPES.has(i.type.toLowerCase()))
