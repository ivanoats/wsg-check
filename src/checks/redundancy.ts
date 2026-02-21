/**
 * WSG 3.5 – Avoid Redundancy and Duplication in Code
 *
 * Detects CSS redundancy signals observable from the HTML document:
 *
 *   1. Repeated inline `style` attribute values — when the same `style="..."`
 *      value appears on three or more elements it is a strong signal that the
 *      styles should be extracted into a reusable CSS class.  Inline styles
 *      cannot be cached and inflate every HTML response.
 *
 *   2. Multiple inline `<style>` blocks — more than one `<style>` element in
 *      a document is usually an organisational artefact that should be
 *      consolidated into a single external stylesheet so the browser can cache
 *      it across page loads.
 *
 * Limitations: external CSS files are not fetched in this pipeline phase, so
 * duplicate CSS rules spread across stylesheets are not detected here.
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#avoid-redundancy-and-duplication-in-code
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '3.5'
const GUIDELINE_NAME = 'Avoid Redundancy and Duplication in Code'
const SUCCESS_CRITERION =
  'CSS should be consolidated; avoid repeated inline styles and multiple style blocks'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#avoid-redundancy-and-duplication-in-code',
]

/**
 * Minimum number of occurrences of the same inline style value before it is
 * flagged as redundant.  Three or more identical inline styles almost always
 * indicate a missing CSS class.
 */
const INLINE_STYLE_REPEAT_THRESHOLD = 3

/** Matches `style="..."` attribute values (double-quoted). */
const INLINE_STYLE_ATTR_PATTERN = /\bstyle="([^"]+)"/gi

/** Matches `<style ...> ... </style>` blocks (case-insensitive, multiline). */
const STYLE_BLOCK_PATTERN = /<style\b[^>]*>[\s\S]*?<\/style>/gi

export const checkCssRedundancy: CheckFn = (page) => {
  const body = page.fetchResult.body
  const issues: string[] = []

  // ── Repeated inline style values ─────────────────────────────────────────
  const styleValueCounts = new Map<string, number>()
  const inlineStyleRegex = new RegExp(INLINE_STYLE_ATTR_PATTERN.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = inlineStyleRegex.exec(body)) !== null) {
    const val = match[1].trim().toLowerCase()
    styleValueCounts.set(val, (styleValueCounts.get(val) ?? 0) + 1)
  }

  const repeated = [...styleValueCounts.entries()].filter(
    ([, count]) => count >= INLINE_STYLE_REPEAT_THRESHOLD
  )
  if (repeated.length > 0) {
    const example = repeated[0]
    issues.push(
      `${repeated.length} inline style value(s) repeated ${INLINE_STYLE_REPEAT_THRESHOLD}+ times` +
        ` (e.g. "${example[0]}" appears ${example[1]} times) — extract to a CSS class`
    )
  }

  // ── Multiple inline <style> blocks ────────────────────────────────────────
  const styleBlockRegex = new RegExp(STYLE_BLOCK_PATTERN.source, 'gi')
  const styleBlocks = body.match(styleBlockRegex) ?? []
  if (styleBlocks.length > 1) {
    issues.push(
      `${styleBlocks.length} inline <style> blocks found — consolidate into a single external stylesheet`
    )
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'No CSS redundancy detected (no repeated inline styles, single style block).',
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
    message: 'CSS redundancy detected in the HTML document.',
    details: issues.join('; '),
    recommendation:
      'Extract repeated inline styles into named CSS classes in an external stylesheet.' +
      ' Consolidate multiple <style> blocks into a single linked CSS file to enable' +
      ' browser caching and reduce per-request HTML payload size.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
  }
}
