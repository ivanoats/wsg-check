/**
 * WSG 3.13 – Responsive Layouts
 *
 * Checks for the three foundational signals of a responsive design:
 *
 *   1. Viewport meta tag — `<meta name="viewport" content="width=device-width,…">`
 *      is required for pages to render correctly on mobile devices.  Without
 *      it, mobile browsers render at desktop width and the user must zoom,
 *      increasing the chance of unnecessary page loads and re-navigations.
 *
 *   2. Responsive images — `<img>` elements should carry a `srcset` attribute
 *      so that mobile devices download appropriately sized images rather than
 *      full-resolution desktop images.  This is one of the highest-impact
 *      bandwidth savings available on image-heavy pages.  SVG images are
 *      vector and are excluded from the srcset test.
 *
 *   3. CSS media queries — the presence of at least one `@media` rule in
 *      inline `<style>` blocks is a positive signal that layout adapts to
 *      different screen sizes.  External CSS is not fetched: with it linked
 *      and no inline `@media`, the signal is "not verifiable", not missing.
 *
 * Scoring:
 *   - Viewport meta missing       → fail  (0)  — non-negotiable requirement
 *   - Viewport OK but images or   → warn (50)
 *     media queries absent
 *   - All three signals present   → pass (100)
 *   - Viewport OK, no srcset      → info (not scored)
 *     issue, external CSS linked
 *     and no inline @media
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#responsive-layouts
 */

import type { CheckFn } from '../core/types'
import { isVectorImage } from '../utils/image-format'

const GUIDELINE_ID = '3.13'
const GUIDELINE_NAME = 'Responsive Layouts'
const SUCCESS_CRITERION =
  'Pages must include a viewport meta tag; raster images should use srcset; CSS should use media queries'
const RESOURCES = ['https://www.w3.org/TR/web-sustainability-guidelines/#responsive-layouts']

/** `<style>` block extractor. */
const STYLE_BLOCK_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gi

// A commented-out @import or @media must not count, so comments are dropped
// before any search. Stripped per block: each <style> is its own stylesheet.
const CSS_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g

/** Matches any `@media` rule in CSS text. */
const MEDIA_QUERY_PATTERN = /@media/i

// An inline `@import` pulls in external CSS the parser does not list as a resource.
// It deliberately accepts both the bare-string and url(...) forms, quoted or unquoted.
const QUOTED_STRING = String.raw`"[^"]*"|'[^']*'`
const URL_FUNCTION = String.raw`url\(\s*(?:${QUOTED_STRING}|[^\s)]+)\s*\)`
const CSS_IMPORT_PATTERN = new RegExp(
  String.raw`@import\s*(?:${URL_FUNCTION}|${QUOTED_STRING})`,
  'i'
)

/**
 * Join the contents of all inline `<style>` blocks. Searching the raw HTML
 * instead would let a pattern span `</style>…<style>` and match page text.
 */
const extractInlineCss = (body: string): string =>
  Array.from(body.matchAll(STYLE_BLOCK_PATTERN), (m) => m[1])
    .map((css) => css.replace(CSS_COMMENT_PATTERN, ''))
    .join('\n')

const MEDIA_QUERY_NOT_VERIFIABLE =
  'CSS media queries not verifiable: declared in external CSS, which is not analysed'

const RECOMMENDATION =
  'Add srcset (and optionally sizes) to every content image so that mobile devices' +
  ' download only the resolution they need. Use CSS @media queries to adapt layouts' +
  ' to different screen sizes and avoid shipping large desktop-only assets to mobile users.'

export const checkResponsiveDesign: CheckFn = (page) => {
  const issues: string[] = []

  // ── 1. Viewport meta tag ──────────────────────────────────────────────────
  const hasViewport = page.parsedPage.metaTags.some((t) => t.name?.toLowerCase() === 'viewport')

  if (!hasViewport) {
    // Viewport is a hard requirement — fail immediately.
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'fail',
      score: 0,
      message: 'Viewport meta tag is missing.',
      details:
        'A <meta name="viewport"> element is required for correct rendering on mobile devices.',
      recommendation:
        'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the' +
        ' document <head>. Without it, mobile browsers render at desktop width, forcing users' +
        ' to zoom and increasing the likelihood of unnecessary navigations.',
      resources: RESOURCES,
      impact: 'high',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  // ── 2. Responsive images (srcset) ─────────────────────────────────────────
  // Identify distinct image src entries (those with a src attribute — the
  // parser also adds srcset-derived entries that have only { srcset: "..." }).
  const imageResources = page.parsedPage.resources.filter(
    (r) => r.type === 'image' && 'src' in r.attributes
  )
  // srcset is meaningless for a vector image, so only raster images count.
  const rasterImages = imageResources.filter((r) => !isVectorImage(r.url))
  const imagesWithSrcset = rasterImages.filter((r) => 'srcset' in r.attributes)

  if (rasterImages.length > 0 && imagesWithSrcset.length === 0) {
    issues.push(
      `${rasterImages.length} raster image(s) found but none use the srcset attribute` +
        ' — add srcset to serve appropriately sized images to each device'
    )
  }

  // ── 3. CSS media queries in inline styles ─────────────────────────────────
  const inlineCss = extractInlineCss(page.fetchResult.body)
  const hasMediaQuery = MEDIA_QUERY_PATTERN.test(inlineCss)
  const hasExternalCss =
    page.parsedPage.resources.some((r) => r.type === 'stylesheet') ||
    CSS_IMPORT_PATTERN.test(inlineCss)
  // With linked CSS, a missing inline @media proves nothing.
  const mediaQueryNote = !hasMediaQuery && hasExternalCss ? MEDIA_QUERY_NOT_VERIFIABLE : undefined
  if (!hasMediaQuery && !hasExternalCss) {
    issues.push(
      'No @media rules detected in inline <style> blocks' +
        ' — note: external stylesheets are not analysed'
    )
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (issues.length === 0 && mediaQueryNote) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'info',
      score: 0,
      message:
        'Viewport meta tag is present; CSS media queries could not be checked because external' +
        ' stylesheets are not analysed.',
      details: mediaQueryNote,
      recommendation: RECOMMENDATION,
      resources: RESOURCES,
      impact: 'high',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message:
        'Viewport meta tag is present, raster images use srcset, and CSS media queries are detected.',
      impact: 'high',
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
    message: 'Responsive design issues detected.',
    details: (mediaQueryNote ? [...issues, mediaQueryNote] : issues).join('; '),
    recommendation: RECOMMENDATION,
    resources: RESOURCES,
    impact: 'high',
    category: 'web-dev',
    machineTestable: true,
  }
}
