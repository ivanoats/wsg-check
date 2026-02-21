/**
 * WSG 3.12 – Preference Media Queries
 *
 * Checks for the presence of CSS preference media queries that adapt the page
 * to the user's system-level accessibility and energy-saving preferences:
 *
 *   - `prefers-color-scheme`    — dark / light mode
 *   - `prefers-reduced-motion`  — reduced animation
 *   - `prefers-reduced-data`    — low-data mode
 *
 * Dark-mode support is particularly relevant for sustainability: research by
 * Google shows that dark mode reduces energy consumption on OLED screens by
 * up to 47% (https://support.google.com/pixelphone/answer/7158589).  It also
 * improves accessibility for users with photosensitivity.
 *
 * Detection approach:
 *   1. Scan all inline `<style>` block content for the preference patterns.
 *   2. Inspect `<link>` element `media` attributes for the preference patterns.
 *
 * Limitation: external CSS files are not fetched, so preference media queries
 * that live exclusively in linked stylesheets will not be detected.  A pass
 * result from this check gives only a partial signal.
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#preference-media-queries
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '3.12'
const GUIDELINE_NAME = 'Preference Media Queries'
const SUCCESS_CRITERION =
  'Use prefers-color-scheme, prefers-reduced-motion, and prefers-reduced-data media queries'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#preference-media-queries',
  'https://support.google.com/pixelphone/answer/7158589',
]

/** Preference features to check for. */
const PREFERENCE_FEATURES = [
  'prefers-color-scheme',
  'prefers-reduced-motion',
  'prefers-reduced-data',
] as const

type PreferenceFeature = (typeof PREFERENCE_FEATURES)[number]

/** Matches `<style ...> ... </style>` blocks (case-insensitive). */
const STYLE_BLOCK_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gi

/**
 * Extract all inline `<style>` block contents from raw HTML.
 */
function extractStyleBlockContent(body: string): string {
  const contents: string[] = []
  const regex = new RegExp(STYLE_BLOCK_PATTERN.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = regex.exec(body)) !== null) {
    contents.push(match[1])
  }
  return contents.join('\n')
}

export const checkPreferenceMediaQueries: CheckFn = (page) => {
  const body = page.fetchResult.body
  const inlineCss = extractStyleBlockContent(body)

  // Combine link media attributes into one searchable string.
  const linkMediaValues = page.parsedPage.links.map((l) => l.media ?? '').join(' ')

  const searchTarget = `${inlineCss} ${linkMediaValues}`

  // ── Detect which preference features are present ──────────────────────────
  const found: PreferenceFeature[] = []
  const missing: PreferenceFeature[] = []

  for (const feature of PREFERENCE_FEATURES) {
    if (searchTarget.includes(feature)) {
      found.push(feature)
    } else {
      missing.push(feature)
    }
  }

  // ── All three found ───────────────────────────────────────────────────────
  if (missing.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message:
        'All three preference media queries detected (prefers-color-scheme,' +
        ' prefers-reduced-motion, prefers-reduced-data).',
      impact: 'medium',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  // ── Some or none found ────────────────────────────────────────────────────
  const foundLabel = found.length > 0 ? `Found: ${found.join(', ')}. ` : ''
  const missingLabel = `Missing: ${missing.join(', ')}.`

  const hasDarkMode = found.includes('prefers-color-scheme')
  const darkModeNote = hasDarkMode
    ? ''
    : ' Dark mode (prefers-color-scheme) reduces energy consumption on OLED' +
      ' screens by up to 47% and improves accessibility for users with photosensitivity.'

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'warn',
    score: 50,
    message: `${missing.length} preference media query feature(s) not detected in inline CSS.`,
    details: `${foundLabel}${missingLabel} Note: external CSS files are not analysed — results may be incomplete.`,
    recommendation:
      `Add CSS @media rules for user preference features: ${missing.join(', ')}.${darkModeNote}` +
      ' Supporting prefers-reduced-motion prevents vestibular disruption for users' +
      ' with motion sensitivities, and prefers-reduced-data helps users on metered connections.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
  }
}
