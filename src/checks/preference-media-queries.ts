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
 *   3. If neither finds any and external CSS is linked (stylesheet or
 *      `@import`), report `info` instead of `warn`.
 *
 * Limitation: external CSS files are not fetched, so preference media queries
 * that live exclusively in linked stylesheets will not be detected.  A pass
 * result gives only a partial signal.
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#preference-media-queries
 */

import type { CheckFn, CheckResult } from '../core/types'
import { extractInlineCss, linksExternalCss } from '../utils/inline-css'

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

const buildRecommendation = (missing: ReadonlyArray<PreferenceFeature>): string => {
  const darkModeNote = missing.includes('prefers-color-scheme')
    ? ' Dark mode (prefers-color-scheme) reduces energy consumption on OLED' +
      ' screens by up to 47% and improves accessibility for users with photosensitivity.'
    : ''
  return (
    `Add CSS @media rules for user preference features: ${missing.join(', ')}.${darkModeNote}` +
    ' Supporting prefers-reduced-motion prevents vestibular disruption for users' +
    ' with motion sensitivities, and prefers-reduced-data helps users on metered connections.'
  )
}

/** Nothing found inline; a linked stylesheet may declare the queries. */
const externalCssResult = (missing: ReadonlyArray<PreferenceFeature>): CheckResult => ({
  guidelineId: GUIDELINE_ID,
  guidelineName: GUIDELINE_NAME,
  successCriterion: SUCCESS_CRITERION,
  status: 'info',
  score: 0,
  message:
    'No preference media queries detected in inline CSS or <link media> attributes; ' +
    'external CSS is not analysed, so this check could not be assessed.',
  details: `Not detected: ${missing.join(', ')}. The linked stylesheet(s) may declare them.`,
  recommendation: buildRecommendation(missing),
  resources: RESOURCES,
  impact: 'medium',
  category: 'web-dev',
  machineTestable: true,
})

export const checkPreferenceMediaQueries: CheckFn = (page) => {
  const body = page.fetchResult.body
  const inlineCss = extractInlineCss(body)

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

  // ── None found, but external CSS is linked ────────────────────────────────
  const hasExternalCss = linksExternalCss(page.parsedPage.resources, inlineCss)
  if (found.length === 0 && hasExternalCss) {
    return externalCssResult(missing)
  }

  // ── Some or none found ────────────────────────────────────────────────────
  const foundLabel = found.length > 0 ? `Found: ${found.join(', ')}. ` : ''
  const missingLabel = `Missing: ${missing.join(', ')}.`

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'warn',
    score: 50,
    message: `${missing.length} preference media query feature(s) not detected in inline CSS.`,
    details: `${foundLabel}${missingLabel} Note: external CSS files are not analysed — results may be incomplete.`,
    recommendation: buildRecommendation(missing),
    resources: RESOURCES,
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
  }
}
