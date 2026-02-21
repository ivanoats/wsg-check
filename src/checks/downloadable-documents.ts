/**
 * WSG 2.17 – Provide Suitable Alternatives to Web Assets (document links check)
 *
 * Detects `<a href>` links pointing to downloadable document formats that may
 * be large, inaccessible, or lacking HTML alternatives:
 *
 *   - Common document formats checked: `.pdf`, `.docx`, `.doc`, `.pptx`,
 *     `.ppt`, `.xlsx`, `.xls`, `.zip`, `.rar`, `.tar`, `.gz`.
 *   - The list of document extensions is configurable via
 *     `DOCUMENT_EXTENSIONS` if needed in future.
 *
 * A warning is raised for each document link found.  The check recommends:
 *   - Providing an HTML alternative for long-lived reference content.
 *   - Compressing files before linking.
 *   - Disclosing the file format and approximate size in the link text.
 *
 * Note: file size checking requires an additional HTTP HEAD request and is
 * not performed in this static-analysis pass.
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#provide-suitable-alternatives
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '2.17'
const GUIDELINE_NAME = 'Provide Suitable Alternatives to Web Assets'
const SUCCESS_CRITERION =
  'Links to downloadable documents should be minimised and paired with HTML alternatives'
const RESOURCES = [
  'https://www.w3.org/TR/web-sustainability-guidelines/#provide-suitable-alternatives',
]

/** Document extensions to flag. */
const DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.doc',
  '.pptx',
  '.ppt',
  '.xlsx',
  '.xls',
  '.zip',
  '.rar',
  '.tar',
  '.gz',
]

/**
 * Matches an `<a href="…">` where the href ends with a document extension
 * (case-insensitive, ignoring query strings and fragments).
 * Capture group 1 = the href value.
 */
const DOC_LINK_PATTERN = new RegExp(
  `<a\\b[^>]*\\bhref=["']([^"'?#]*(?:${DOCUMENT_EXTENSIONS.map((e) => e.replace('.', '\\.')).join('|')}))[^"']*["']`,
  'gi'
)

export const checkDownloadableDocuments: CheckFn = (page) => {
  const body = page.fetchResult.body
  const docLinks: string[] = []

  const regex = new RegExp(DOC_LINK_PATTERN.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = regex.exec(body)) !== null) {
    docLinks.push(match[1])
  }

  if (docLinks.length === 0) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'No links to downloadable document files detected.',
      impact: 'low',
      category: 'ux',
      machineTestable: true,
    }
  }

  const extensionsSeen = [
    ...new Set(
      docLinks.map((href) => {
        const lower = href.toLowerCase()
        return DOCUMENT_EXTENSIONS.find((ext) => lower.endsWith(ext)) ?? ''
      })
    ),
  ]
    .filter(Boolean)
    .join(', ')

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'warn',
    score: 50,
    message: `${docLinks.length} link(s) to downloadable document file(s) detected (${extensionsSeen}).`,
    details:
      `Found ${docLinks.length} document link(s). File format(s): ${extensionsSeen}. ` +
      'Static analysis cannot determine file sizes — consider auditing large documents manually.',
    recommendation:
      'For long-lived reference content, provide an HTML page as the primary format and ' +
      'offer the document as a supplementary download. Include the file format and approximate ' +
      'size in the link text (e.g. "Annual Report 2024 (PDF, 2 MB)"). Compress documents ' +
      'before hosting and remove outdated files.',
    resources: RESOURCES,
    impact: 'low',
    category: 'ux',
    machineTestable: true,
  }
}
