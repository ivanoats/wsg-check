/**
 * WSG 3.19 – Use the Latest Stable Language Version
 *
 * Checks that the HTML document uses the modern HTML5 standard and does not
 * contain deprecated elements that require extra browser CSS/JS to render or
 * degrade accessibility.
 *
 * `checkHtmlVersion`:
 *   1. DOCTYPE check — the document should use the HTML5 short doctype
 *      (`<!DOCTYPE html>`).  Legacy doctypes (HTML4, XHTML, etc.) trigger
 *      quirks-mode or standards-mode variations that force browsers to load
 *      additional compatibility code.
 *
 *   2. Deprecated elements — several HTML elements have been removed from
 *      the living standard.  Their use relies on legacy browser behaviour,
 *      often requires polyfills, and signals unmaintained code:
 *        `<font>`, `<center>`, `<marquee>`, `<blink>`,
 *        `<frameset>`, `<frame>`, `<noframes>`,
 *        `<applet>`, `<dir>`, `<basefont>`
 *
 * Scoring:
 *   - HTML5 doctype + no deprecated elements → pass  (100)
 *   - Any issue found                        → warn   (50)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#use-the-latest-stable-language-version
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '3.19'
const GUIDELINE_NAME = 'Use the Latest Stable Language Version'
const SUCCESS_CRITERION = 'Pages should use the HTML5 doctype and avoid deprecated HTML elements'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#use-the-latest-stable-language-version',
]

/** The canonical HTML5 short doctype (case-insensitive comparison). */
const HTML5_DOCTYPE = '<!doctype html>'

/**
 * Deprecated HTML elements that have been removed from the HTML5 specification.
 * Matches opening tags of any of these elements (case-insensitive).
 */
const DEPRECATED_ELEMENTS = [
  'font',
  'center',
  'marquee',
  'blink',
  'frameset',
  'frame',
  'noframes',
  'applet',
  'dir',
  'basefont',
] as const

export const checkHtmlVersion: CheckFn = (page) => {
  const { doctype } = page.parsedPage
  const body = page.fetchResult.body
  const issues: string[] = []

  // ── DOCTYPE check ─────────────────────────────────────────────────────────
  if (!doctype) {
    issues.push('No DOCTYPE declaration found — add <!DOCTYPE html> to the document')
  } else if (doctype.toLowerCase().trim() !== HTML5_DOCTYPE) {
    issues.push(
      `Non-HTML5 DOCTYPE detected: "${doctype}" — replace with the HTML5 short form <!DOCTYPE html>`
    )
  }

  // ── Deprecated elements ───────────────────────────────────────────────────
  const deprecatedMatches = DEPRECATED_ELEMENTS.filter((el) =>
    new RegExp(`<${el}(\\s[^>]*>|>|\\s*/>)`, 'i').test(body)
  )
  if (deprecatedMatches.length > 0) {
    issues.push(
      `Deprecated HTML element(s) found: <${deprecatedMatches.join('>, <')}>` +
        ' — replace with modern equivalents'
    )
  }

  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'HTML5 DOCTYPE declared and no deprecated elements found.',
      impact: 'medium',
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
    message: `${issues.length} HTML version issue(s) found.`,
    details: issues.join('; '),
    recommendation:
      'Use <!DOCTYPE html> at the top of every HTML document to enable standards mode. ' +
      'Replace deprecated elements: <font> → CSS, <center> → CSS text-align, ' +
      '<marquee>/<blink> → CSS animations, <frameset>/<frame> → <iframe> or single-page layouts, ' +
      '<applet> → <object> or JavaScript, <dir> → <ul>, <basefont> → CSS font-family.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
  }
}
