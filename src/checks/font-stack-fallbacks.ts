/**
 * WSG 2.16 – Ensure Content Is Readable Without Custom Fonts (fallback check)
 *
 * Checks that CSS `font-family` declarations include system font fallbacks so
 * that content remains readable if custom fonts fail to load or are unavailable:
 *
 *   - A well-formed font stack ends with a generic family keyword:
 *     `serif`, `sans-serif`, `monospace`, `cursive`, `fantasy`,
 *     or `system-ui`.
 *   - Including common system fonts (e.g. `Arial`, `Helvetica`,
 *     `-apple-system`) before the generic also improves perceived
 *     performance by using a locally installed font while the web font loads.
 *
 * Detection approach:
 *   Scan inline `<style>` blocks for `font-family` declarations and check
 *   whether each declaration contains a generic family or a known system font.
 *
 * Limitation: external stylesheets are not analysed.
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#ensure-content-is-readable-without-custom-fonts
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '2.16'
const GUIDELINE_NAME = 'Ensure Content Is Readable Without Custom Fonts'
const SUCCESS_CRITERION =
  'font-family declarations should include system font fallbacks and a generic family'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#ensure-content-is-readable-without-custom-fonts',
]

/** CSS generic family keywords. */
const GENERIC_FAMILIES = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui']

/** Common system/platform fonts that serve as reliable fallbacks. */
const SYSTEM_FONTS = [
  '-apple-system',
  'blinkmacsystemfont',
  'segoe ui',
  'roboto',
  'helvetica neue',
  'arial',
  'helvetica',
  'georgia',
  'times new roman',
  'courier new',
]

/** Matches `<style …> … </style>` blocks. */
const STYLE_BLOCK_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gi

/** Matches `font-family: <value>;` declarations (greedy value capture). */
const FONT_FAMILY_PATTERN = /font-family\s*:\s*([^;}]+)/gi

function extractStyleBlocks(body: string): string {
  const contents: string[] = []
  const regex = new RegExp(STYLE_BLOCK_PATTERN.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = regex.exec(body)) !== null) {
    contents.push(match[1])
  }
  return contents.join('\n')
}

/** Returns true when the font-family value string contains a suitable fallback. */
function normalizeFontToken(token: string): string {
  // Trim whitespace, remove surrounding single/double quotes, and lowercase for comparison.
  return token.trim().replace(/^['"]+|['"]+$/g, '').toLowerCase()
}

function hasFallback(value: string): boolean {
  // Split on commas per CSS font-family syntax and inspect each token individually.
  const tokens = value.split(',')

  for (const rawToken of tokens) {
    const token = normalizeFontToken(rawToken)
    if (!token) continue

    if (GENERIC_FAMILIES.includes(token)) return true
    if (SYSTEM_FONTS.includes(token)) return true
  }
  return false
}

export const checkFontStackFallbacks: CheckFn = (page) => {
  const inlineCss = extractStyleBlocks(page.fetchResult.body)

  const fontFamilyDecls: string[] = []
  const fontFamilyRegex = new RegExp(FONT_FAMILY_PATTERN.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = fontFamilyRegex.exec(inlineCss)) !== null) {
    fontFamilyDecls.push(match[1].trim())
  }

  if (fontFamilyDecls.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'not-applicable',
      score: 0,
      message: 'No font-family declarations detected in inline CSS — check not applicable.',
      impact: 'low',
      category: 'ux',
      machineTestable: true,
    }
  }

  const withoutFallback = fontFamilyDecls.filter((v) => !hasFallback(v))

  if (withoutFallback.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `All ${fontFamilyDecls.length} font-family declaration(s) include system font fallbacks.`,
      impact: 'low',
      category: 'ux',
      machineTestable: true,
    }
  }

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'warn',
    score: 50,
    message: `${withoutFallback.length} of ${fontFamilyDecls.length} font-family declaration(s) lack system font fallbacks.`,
    details:
      `${withoutFallback.length} font-family declaration(s) do not include a generic family ` +
      '(e.g. sans-serif) or a system font. Note: external stylesheets are not analysed.',
    recommendation:
      'End every font-family declaration with a generic family keyword (e.g. sans-serif, serif, ' +
      'monospace) so the browser has a reliable fallback when the custom font cannot be loaded. ' +
      'Example: font-family: "MyFont", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif.',
    resources: RESOURCES,
    impact: 'low',
    category: 'ux',
    machineTestable: true,
  }
}
