/**
 * WSG 3.14 – Standards-Based JavaScript
 *
 * Detects signals of unnecessary or inefficient JavaScript use:
 *
 *   1. External script count — each additional script file adds a round-trip.
 *      Modern tooling should bundle scripts into a small number of files.
 *      Thresholds: > 9 → warn, > 14 → fail.
 *
 *   2. `document.write()` usage — synchronously inserts markup into the parser
 *      stream, blocking rendering and preventing resource pre-loading.  Its use
 *      is considered harmful and is flagged as a fail.
 *
 *   3. Large inline scripts — inline `<script>` content cannot be cached by
 *      the browser.  Scripts larger than 2 KB of raw source should be moved to
 *      external files.  Threshold: > 2 000 characters total → warn.
 *
 * Scoring:
 *   - `document.write()` present                    → fail  (0)
 *   - > 14 external scripts                         → fail  (0)
 *   - > 9 external scripts OR large inline scripts  → warn (50)
 *   - All checks pass                               → pass (100)
 *   - No scripts at all                             → not-applicable
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#use-the-latest-stable-language-version
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '3.14'
const GUIDELINE_NAME = 'Standards-Based JavaScript'
const SUCCESS_CRITERION =
  'Minimise external script count, avoid document.write(), and keep inline scripts small'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#use-the-latest-stable-language-version',
]

/** External script count above which a warn is issued. */
const SCRIPT_COUNT_WARN = 9
/** External script count above which a fail is issued. */
const SCRIPT_COUNT_FAIL = 14

/** Maximum total inline-script character count before a warn is issued. */
const INLINE_SCRIPT_CHAR_WARN = 2_000

/** Matches inline `<script>` elements — those with no `src` attribute. */
const INLINE_SCRIPT_PATTERN = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi

/** Detects `document.write(` calls in script content. */
const DOCUMENT_WRITE_PATTERN = /\bdocument\.write\s*\(/

export const checkSustainableJs: CheckFn = (page) => {
  const body = page.fetchResult.body

  // ── External scripts ──────────────────────────────────────────────────────
  const externalScripts = page.parsedPage.resources.filter((r) => r.type === 'script')
  const externalScriptCount = externalScripts.length

  // ── Inline scripts ────────────────────────────────────────────────────────
  const inlineScriptContents: string[] = []
  const inlineRegex = new RegExp(INLINE_SCRIPT_PATTERN.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = inlineRegex.exec(body)) !== null) {
    const content = match[1].trim()
    if (content.length > 0) {
      inlineScriptContents.push(content)
    }
  }

  // No scripts at all → not-applicable
  if (externalScriptCount === 0 && inlineScriptContents.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'not-applicable',
      score: 0,
      message: 'No JavaScript found on the page.',
      impact: 'medium',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  const issues: string[] = []
  let status: 'pass' | 'warn' | 'fail' = 'pass'
  let score = 100

  // ── Check: document.write() ───────────────────────────────────────────────
  const hasDocumentWrite = inlineScriptContents.some((c) => DOCUMENT_WRITE_PATTERN.test(c))
  if (hasDocumentWrite) {
    status = 'fail'
    score = 0
    issues.push(
      'document.write() detected — this API blocks HTML parsing and prevents' +
        ' resource pre-loading; replace with DOM manipulation methods'
    )
  }

  // ── Check: external script count ─────────────────────────────────────────
  if (externalScriptCount > SCRIPT_COUNT_FAIL) {
    if (status !== 'fail') {
      status = 'fail'
      score = 0
    }
    issues.push(
      `${externalScriptCount} external script(s) found (budget: ${SCRIPT_COUNT_FAIL})` +
        ' — bundle scripts to reduce round-trips'
    )
  } else if (externalScriptCount > SCRIPT_COUNT_WARN) {
    if (status === 'pass') {
      status = 'warn'
      score = 50
    }
    issues.push(
      `${externalScriptCount} external script(s) found (budget: ${SCRIPT_COUNT_WARN})` +
        ' — consider bundling to reduce round-trips'
    )
  }

  // ── Check: large inline scripts ───────────────────────────────────────────
  const totalInlineChars = inlineScriptContents.reduce((sum, c) => sum + c.length, 0)
  if (totalInlineChars > INLINE_SCRIPT_CHAR_WARN) {
    if (status === 'pass') {
      status = 'warn'
      score = 50
    }
    issues.push(
      `${totalInlineChars} characters of inline script content found` +
        ` (budget: ${INLINE_SCRIPT_CHAR_WARN} chars) — move to external files for caching`
    )
  }

  // ── All clear ─────────────────────────────────────────────────────────────
  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `JavaScript usage looks sustainable (${externalScriptCount} external script(s), no critical anti-patterns).`,
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
    message: 'JavaScript sustainability issues detected.',
    details: issues.join('; '),
    recommendation:
      'Bundle JavaScript into a small number of files using a modern bundler (esbuild,' +
      ' Rollup, webpack). Move large inline scripts to external files so they can be' +
      ' cached across page loads. Replace document.write() calls with DOM manipulation' +
      ' (e.g. element.insertAdjacentHTML, element.appendChild).',
    resources: RESOURCES,
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
  }
}
