/**
 * WSG 2.16 – Ensure Content Is Readable Without Custom Fonts
 *
 * Checks font delivery signals to ensure fonts are served efficiently and
 * content remains readable if custom fonts fail to load:
 *
 *   1. WOFF2 format — the most efficient web font format; pages should
 *      prefer it over WOFF, TTF, OTF, or EOT.
 *
 *   2. `font-display` descriptor — controls rendering behaviour while a
 *      font is loading.  Missing `font-display` means the browser may
 *      hide text (FOIT) while the font loads, wasting user attention and
 *      time.  `font-display: swap` or `optional` are recommended.
 *      External CSS is not fetched: with it linked and no inline
 *      `@font-face`, the descriptor is "not verifiable", not missing.
 *
 *   3. Font file count — each font file requires a separate download;
 *      pages should not exceed 4 font files (style × weight combinations).
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#ensure-content-is-readable-without-custom-fonts
 */

import type { CheckFn, CheckResult } from '../core/types'

const GUIDELINE_ID = '2.16'
const GUIDELINE_NAME = 'Ensure Content Is Readable Without Custom Fonts'
const SUCCESS_CRITERION =
  'Fonts should use WOFF2 format, declare font-display, and be limited in number'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#ensure-content-is-readable-without-custom-fonts',
]

/** Maximum recommended number of font files. */
const MAX_FONT_FILES = 4

/** `<style>` block extractor. */
const STYLE_BLOCK_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gi

/** Matches a `font-display` descriptor in CSS. */
const FONT_DISPLAY_PATTERN = /font-display\s*:/i

/** `font-display` is only valid inside `@font-face`. */
const FONT_FACE_PATTERN = /@font-face/i

/** An inline `@import` pulls in external CSS the parser does not list as a resource. */
const CSS_IMPORT_PATTERN = /@import\b/i

// A commented-out @import or font-display must not count, so comments are
// dropped before any search. Stripped per block: each <style> is its own stylesheet.
const CSS_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g

const FONT_DISPLAY_NOT_VERIFIABLE =
  'font-display not verifiable: declared in external CSS, which is not analysed'

const RECOMMENDATION =
  'Convert font files to WOFF2 format. Add font-display: swap (or optional) to @font-face ' +
  'rules so text is visible immediately while fonts load. Limit font files to ' +
  `${MAX_FONT_FILES} or fewer by choosing a type family with a variable font or fewer variants.`

function extractStyleBlocks(body: string): string {
  const contents: string[] = []
  const regex = new RegExp(STYLE_BLOCK_PATTERN.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = regex.exec(body)) !== null) {
    contents.push(match[1].replace(CSS_COMMENT_PATTERN, ''))
  }
  return contents.join('\n')
}

/** A missing descriptor is an issue only when the `@font-face` rules are inline. */
const fontDisplayVerdict = (
  inlineCss: string,
  hasExternalCss: boolean
): { readonly issue?: string; readonly note?: string } => {
  if (FONT_DISPLAY_PATTERN.test(inlineCss)) return {}
  if (hasExternalCss && !FONT_FACE_PATTERN.test(inlineCss)) {
    return { note: FONT_DISPLAY_NOT_VERIFIABLE }
  }
  return {
    issue:
      'No font-display descriptor detected in inline CSS — ' +
      'add font-display: swap to prevent invisible text during font load (FOIT)',
  }
}

/** WOFF2 and file count are fine, but font-display could not be checked. */
const unverifiableFontDisplayResult = (fontCount: number, woff2Count: number): CheckResult => ({
  guidelineId: GUIDELINE_ID,
  guidelineName: GUIDELINE_NAME,
  successCriterion: SUCCESS_CRITERION,
  status: 'info',
  score: 0,
  message: `${fontCount} font file(s) found (${woff2Count} WOFF2); font-display could not be checked.`,
  details: FONT_DISPLAY_NOT_VERIFIABLE,
  recommendation: RECOMMENDATION,
  resources: RESOURCES,
  impact: 'medium',
  category: 'ux',
  machineTestable: true,
})

export const checkWebTypography: CheckFn = (page) => {
  const fontResources = page.parsedPage.resources.filter((r) => r.type === 'font')

  if (fontResources.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'not-applicable',
      score: 0,
      message: 'No font resources detected — typography check not applicable.',
      impact: 'medium',
      category: 'ux',
      machineTestable: true,
    }
  }

  const inlineCss = extractStyleBlocks(page.fetchResult.body)
  const issues: string[] = []

  // ── 1. WOFF2 format ───────────────────────────────────────────────────────
  const woff2Fonts = fontResources.filter((r) => r.url.toLowerCase().endsWith('.woff2'))
  if (woff2Fonts.length === 0) {
    issues.push(
      `${fontResources.length} font file(s) found but none use WOFF2 format — ` +
        'WOFF2 reduces font file size by ~30% compared with WOFF'
    )
  }

  // ── 2. font-display ───────────────────────────────────────────────────────
  const hasExternalCss =
    page.parsedPage.resources.some((r) => r.type === 'stylesheet') ||
    CSS_IMPORT_PATTERN.test(inlineCss)
  const fontDisplay = fontDisplayVerdict(inlineCss, hasExternalCss)
  if (fontDisplay.issue) {
    issues.push(fontDisplay.issue)
  }

  // ── 3. Font file count ────────────────────────────────────────────────────
  if (fontResources.length > MAX_FONT_FILES) {
    issues.push(
      `${fontResources.length} font file(s) detected (recommended maximum: ${MAX_FONT_FILES}) — ` +
        'reduce the number of font weight/style variants to lower page weight'
    )
  }

  if (issues.length === 0 && fontDisplay.note) {
    return unverifiableFontDisplayResult(fontResources.length, woff2Fonts.length)
  }

  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `Font delivery looks efficient: ${fontResources.length} WOFF2 font(s) with font-display declared.`,
      impact: 'medium',
      category: 'ux',
      machineTestable: true,
    }
  }

  // Not using WOFF2 at all is the most impactful issue.
  const isCritical = woff2Fonts.length === 0

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: isCritical ? 'fail' : 'warn',
    score: isCritical ? 0 : 50,
    message: `${issues.length} web typography issue(s) detected.`,
    details: (fontDisplay.note ? [...issues, fontDisplay.note] : issues).join('; '),
    recommendation: RECOMMENDATION,
    resources: RESOURCES,
    impact: 'medium',
    category: 'ux',
    machineTestable: true,
  }
}
