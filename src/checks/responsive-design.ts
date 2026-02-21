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
 *      bandwidth savings available on image-heavy pages.
 *
 *   3. CSS media queries — the presence of at least one `@media` rule in
 *      inline `<style>` blocks is a positive signal that layout adapts to
 *      different screen sizes.
 *
 * Scoring:
 *   - Viewport meta missing       → fail  (0)  — non-negotiable requirement
 *   - Viewport OK but images or   → warn (50)
 *     media queries absent
 *   - All three signals present   → pass (100)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#responsive-layouts
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '3.13'
const GUIDELINE_NAME = 'Responsive Layouts'
const SUCCESS_CRITERION =
  'Pages must include a viewport meta tag; images should use srcset; CSS should use media queries'
const RESOURCES = ['https://www.w3.org/TR/web-sustainability-guidelines/#responsive-layouts']

/** Matches any `@media` rule inside a `<style>` block. */
const MEDIA_QUERY_IN_STYLE_PATTERN = /<style\b[^>]*>[\s\S]*?@media[\s\S]*?<\/style>/i

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
  const imagesWithSrcset = imageResources.filter((r) => 'srcset' in r.attributes)

  if (imageResources.length > 0 && imagesWithSrcset.length === 0) {
    issues.push(
      `${imageResources.length} image(s) found but none use the srcset attribute` +
        ' — add srcset to serve appropriately sized images to each device'
    )
  }

  // ── 3. CSS media queries in inline styles ─────────────────────────────────
  const hasMediaQuery = MEDIA_QUERY_IN_STYLE_PATTERN.test(page.fetchResult.body)
  if (!hasMediaQuery) {
    issues.push(
      'No @media rules detected in inline <style> blocks' +
        ' — note: external stylesheets are not analysed'
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
      message:
        'Viewport meta tag is present, images use srcset, and CSS media queries are detected.',
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
    details: issues.join('; '),
    recommendation:
      'Add srcset (and optionally sizes) to every content image so that mobile devices' +
      ' download only the resolution they need. Use CSS @media queries to adapt layouts' +
      ' to different screen sizes and avoid shipping large desktop-only assets to mobile users.',
    resources: RESOURCES,
    impact: 'high',
    category: 'web-dev',
    machineTestable: true,
  }
}
