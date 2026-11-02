/**
 * WSG 2.7 – Avoid Unnecessary or an Overabundance of Assets
 *
 * Checks that images are served in modern, efficient formats and include
 * dimensional attributes to prevent layout shifts:
 *
 *   1. Modern image formats — WebP and AVIF offer significantly better
 *      compression than JPEG or PNG.  Pages should prefer these formats
 *      for content images.  SVG (vector) images are excluded from the format
 *      test; they still need dimensions.
 *
 *   2. Explicit `width` / `height` attributes — prevents Cumulative Layout
 *      Shift (CLS) by reserving space before the image loads, avoiding
 *      unnecessary re-paints and re-layouts.
 *
 * Scoring:
 *   - Raster images present but none use WebP/AVIF → fail  (0)
 *   - No format issue (modern or vector) but some images lack dimensions → warn (50)
 *   - All images in modern or vector formats with dimensions → pass (100)
 *   - No images found → not-applicable
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#avoid-unnecessary-or-an-overabundance-of-assets
 */

import type { CheckFn } from '../core/types'
import { imagePathname, isVectorImage } from '../utils/image-format'

const GUIDELINE_ID = '2.7'
const GUIDELINE_NAME = 'Avoid Unnecessary or an Overabundance of Assets'
const SUCCESS_CRITERION =
  'Raster images should use modern formats (WebP/AVIF); all images should include width and height attributes'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#avoid-unnecessary-or-an-overabundance-of-assets',
]

/** Modern image format extensions. */
const MODERN_IMAGE_FORMATS = ['.webp', '.avif']

/** Returns `true` when the URL path ends with a modern image format extension. */
function isModernFormat(url: string): boolean {
  const pathname = imagePathname(url)
  return MODERN_IMAGE_FORMATS.some((ext) => pathname.endsWith(ext))
}

const FORMAT_RECOMMENDATION =
  'Convert images to WebP or AVIF format using a build-time image pipeline or CDN ' +
  'image transform.'
const DIMENSION_RECOMMENDATION =
  'Add explicit width and height attributes to every <img> element ' +
  'to prevent layout shifts while images are loading.'

/** Names only the problems found, so an SVG-only page is not told to convert. */
const buildRecommendation = (hasFormatIssue: boolean, hasDimensionIssue: boolean): string =>
  [
    hasFormatIssue ? FORMAT_RECOMMENDATION : null,
    hasDimensionIssue ? DIMENSION_RECOMMENDATION : null,
  ]
    .filter((s): s is string => s !== null)
    .join(' ')

export const checkOptimizedMedia: CheckFn = (page) => {
  // Only inspect primary image resources (those with an explicit src attribute).
  const imageResources = page.parsedPage.resources.filter(
    (r) => r.type === 'image' && 'src' in r.attributes
  )

  if (imageResources.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'not-applicable',
      score: 0,
      message: 'No images found — optimized media check not applicable.',
      impact: 'high',
      category: 'ux',
      machineTestable: true,
    }
  }

  const issues: string[] = []

  // ── 1. Modern image formats ───────────────────────────────────────────────
  // SVG has no WebP/AVIF equivalent, so only raster images count here.
  const rasterImages = imageResources.filter((r) => !isVectorImage(r.url))
  const modernFormatImages = rasterImages.filter((r) => isModernFormat(r.url))
  const hasFormatIssue = rasterImages.length > 0 && modernFormatImages.length === 0
  if (hasFormatIssue) {
    issues.push(
      `${rasterImages.length} raster image(s) found but none use WebP or AVIF format — ` +
        'modern formats reduce file size by 25–50% compared with JPEG/PNG'
    )
  }

  // ── 2. Explicit dimensions ────────────────────────────────────────────────
  const imagesWithDimensions = imageResources.filter(
    (r) => 'width' in r.attributes && 'height' in r.attributes
  )
  const hasDimensionIssue = imagesWithDimensions.length < imageResources.length
  if (hasDimensionIssue) {
    const missing = imageResources.length - imagesWithDimensions.length
    issues.push(
      `${missing} of ${imageResources.length} image(s) lack explicit width and height attributes — ` +
        'add these to prevent layout shifts (CLS)'
    )
  }

  if (issues.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `All ${imageResources.length} image(s) use modern or vector formats and have explicit dimensions.`,
      impact: 'high',
      category: 'ux',
      machineTestable: true,
    }
  }

  // A format issue is the more critical problem; dimension-only issues warn.
  const isCritical = hasFormatIssue

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: isCritical ? 'fail' : 'warn',
    score: isCritical ? 0 : 50,
    message: 'Image optimisation issues detected.',
    details: issues.join('; '),
    recommendation: buildRecommendation(hasFormatIssue, hasDimensionIssue),
    resources: RESOURCES,
    impact: 'high',
    category: 'ux',
    machineTestable: true,
  }
}
