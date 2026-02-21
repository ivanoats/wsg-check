/**
 * WSG 3.4  – Use Metadata Correctly
 * WSG 3.13 – Use Metadata, Microdata, and Schema.org
 *
 * Two related checks covering page metadata and structured data:
 *
 * `checkMetadata` (WSG 3.4)
 *   Validates that every page declares the essential metadata that enables
 *   accurate search-engine previews and social-media cards, reducing
 *   unnecessary page visits caused by misleading or missing descriptions:
 *     - `<title>` element (required)
 *     - `<meta name="description">` (required)
 *     - Open Graph tags `og:title` and `og:description` (recommended)
 *
 * `checkStructuredData` (WSG 3.13)
 *   Checks for JSON-LD structured data (Schema.org).  Rich search results
 *   surface the most relevant information directly in the SERP, reducing the
 *   number of page loads needed for a user to find what they need.
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#use-metadata-correctly
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#use-metadata-microdata-and-schema-org
 */

import type { CheckFn } from '../core/types.js'

// ─── checkMetadata (WSG 3.4) ──────────────────────────────────────────────────

const META_GUIDELINE_ID = '3.4'
const META_GUIDELINE_NAME = 'Use Metadata Correctly'
const META_SUCCESS_CRITERION =
  'Pages should have a <title>, meta description, and Open Graph metadata'
const META_RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#use-metadata-correctly',
]

export const checkMetadata: CheckFn = (page) => {
  const { title, metaTags } = page.parsedPage
  const issues: string[] = []

  if (!title) {
    issues.push('Missing <title> element')
  }

  const hasDescription = metaTags.some(
    (t) => t.name?.toLowerCase() === 'description' && t.content?.trim()
  )
  if (!hasDescription) {
    issues.push('Missing <meta name="description">')
  }

  const hasOgTitle = metaTags.some((t) => t.property === 'og:title')
  const hasOgDescription = metaTags.some((t) => t.property === 'og:description')
  if (!hasOgTitle || !hasOgDescription) {
    issues.push('Missing Open Graph tags (og:title and/or og:description)')
  }

  if (issues.length === 0) {
    return {
      guidelineId: META_GUIDELINE_ID,
      guidelineName: META_GUIDELINE_NAME,
      successCriterion: META_SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'Page metadata is complete (title, description, and Open Graph tags present).',
      impact: 'low',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  // Missing title or description are critical — without them search engines
  // cannot generate accurate previews, increasing the likelihood of
  // unnecessary click-throughs and page loads.
  const isCritical = !title || !hasDescription

  return {
    guidelineId: META_GUIDELINE_ID,
    guidelineName: META_GUIDELINE_NAME,
    successCriterion: META_SUCCESS_CRITERION,
    status: isCritical ? 'fail' : 'warn',
    score: isCritical ? 0 : 50,
    message: `${issues.length} metadata issue(s) found.`,
    details: issues.join('; '),
    recommendation:
      'Add a concise, descriptive <title> and a <meta name="description"> to every page. Include og:title, og:description, and og:image so that social media and messaging apps generate accurate link previews, reducing unnecessary navigations to the wrong page.',
    resources: META_RESOURCES,
    impact: 'low',
    category: 'web-dev',
    machineTestable: true,
  }
}

// ─── checkStructuredData (WSG 3.13) ──────────────────────────────────────────

const SD_GUIDELINE_ID = '3.13'
const SD_GUIDELINE_NAME = 'Use Metadata, Microdata, and Schema.org'
const SD_SUCCESS_CRITERION =
  'Pages should include Schema.org JSON-LD structured data to enable rich search results'
const SD_RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#use-metadata-microdata-and-schema-org',
]

export const checkStructuredData: CheckFn = (page) => {
  const { structuredData } = page.parsedPage

  if (structuredData.length === 0) {
    return {
      guidelineId: SD_GUIDELINE_ID,
      guidelineName: SD_GUIDELINE_NAME,
      successCriterion: SD_SUCCESS_CRITERION,
      status: 'warn',
      score: 50,
      message: 'No JSON-LD structured data found.',
      recommendation:
        'Add Schema.org structured data using a <script type="application/ld+json"> block. Rich results surface key information directly in search engine results pages, reducing the number of page loads needed for users to find what they are looking for.',
      resources: SD_RESOURCES,
      impact: 'low',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  const types = structuredData.map((sd) => sd.type).join(', ')

  return {
    guidelineId: SD_GUIDELINE_ID,
    guidelineName: SD_GUIDELINE_NAME,
    successCriterion: SD_SUCCESS_CRITERION,
    status: 'pass',
    score: 100,
    message: `Found ${structuredData.length} JSON-LD structured data block(s): ${types}.`,
    impact: 'low',
    category: 'web-dev',
    machineTestable: true,
  }
}
