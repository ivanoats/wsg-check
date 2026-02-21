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
 *
 *   3. Font file count — each font file requires a separate download;
 *      pages should not exceed 4 font files (style × weight combinations).
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#ensure-content-is-readable-without-custom-fonts
 */

import type { CheckFn } from '../core/types.js'

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

function extractStyleBlocks(body: string): string {
  const contents: string[] = []
  const regex = new RegExp(STYLE_BLOCK_PATTERN.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = regex.exec(body)) !== null) {
    contents.push(match[1])
  }
  return contents.join('\n')
}

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
  const hasFontDisplay = FONT_DISPLAY_PATTERN.test(inlineCss)
  if (!hasFontDisplay) {
    issues.push(
      'No font-display descriptor detected in inline CSS — ' +
        'add font-display: swap to prevent invisible text during font load (FOIT)'
    )
  }

  // ── 3. Font file count ────────────────────────────────────────────────────
  if (fontResources.length > MAX_FONT_FILES) {
    issues.push(
      `${fontResources.length} font file(s) detected (recommended maximum: ${MAX_FONT_FILES}) — ` +
        'reduce the number of font weight/style variants to lower page weight'
    )
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
    details: issues.join('; '),
    recommendation:
      'Convert font files to WOFF2 format. Add font-display: swap (or optional) to @font-face ' +
      'rules so text is visible immediately while fonts load. Limit font files to ' +
      `${MAX_FONT_FILES} or fewer by choosing a type family with a variable font or fewer variants.`,
    resources: RESOURCES,
    impact: 'medium',
    category: 'ux',
    machineTestable: true,
  }
}
