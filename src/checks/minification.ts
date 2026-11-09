/**
 * WSG 3.3 – Minify Your HTML, CSS, and JavaScript
 *
 * Detects signals of unminified HTML served to the client.  Unminified HTML
 * contains excess whitespace and comments that increase transfer size and
 * therefore energy consumption.
 *
 * Heuristics applied to the raw HTML response body:
 *   1. Blank-line ratio > 10%  → likely unminified HTML
 *   2. More than 2 author HTML comments  → likely unminified HTML
 *      (conditional, whitespace-only and React marker comments don't count)
 *
 * Limitations: the content of external CSS and JS files is not fetched in
 * this pipeline phase, so this check is limited to what is observable from
 * the initial HTML response.
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#minify-your-html-css-and-javascript
 */

import type { CheckFn } from '../core/types'

// Matches HTML comments that are NOT conditional IE comments (<!--[if ...]),
// capturing the comment text.
const NON_CONDITIONAL_COMMENT = /<!--(?!\[if\s)([\s\S]*?)-->/g

/**
 * Comment texts React 19 server rendering emits (react-dom-server: Suspense
 * `$` `/$` `$?` `$!`, Activity `&` `/&`, form state `F!` `F`, preamble
 * `html` `head` `body`). Hydration needs them, so a minifier cannot remove
 * them. The text separator `<!-- -->` is covered by the whitespace rule.
 * Matched exactly, so an author's `<!-- head -->` still counts.
 */
const REACT_MARKERS = new Set(['$', '/$', '$?', '$!', '&', '/&', 'F!', 'F', 'html', 'head', 'body'])

function isAuthorComment(text: string): boolean {
  return text.trim() !== '' && !REACT_MARKERS.has(text)
}

/** Fraction of blank lines above which the HTML is treated as unminified. */
const BLANK_LINE_THRESHOLD = 0.1

/**
 * Minimum number of lines required before the blank-line ratio heuristic is
 * applied.  Very short (or empty) responses are skipped to avoid false
 * positives on minimal HTML stubs.
 */
const MIN_LINES_FOR_RATIO_CHECK = 5

/** Number of HTML comments above which the HTML is treated as unminified. */
const COMMENT_COUNT_THRESHOLD = 2

export const checkMinification: CheckFn = (page) => {
  const body = page.fetchResult.body
  const lines = body.split('\n')
  const totalLines = lines.length

  // ── Blank-line ratio ──────────────────────────────────────────────────────
  const blankLineCount = lines.filter((l) => l.trim() === '').length
  const blankRatio = totalLines > 0 ? blankLineCount / totalLines : 0

  // ── HTML comment count ────────────────────────────────────────────────────
  const commentCount = [...body.matchAll(NON_CONDITIONAL_COMMENT)].filter((m) =>
    isAuthorComment(m[1])
  ).length

  // ── Assess ───────────────────────────────────────────────────────────────
  const issues: string[] = []

  if (blankRatio > BLANK_LINE_THRESHOLD && totalLines >= MIN_LINES_FOR_RATIO_CHECK) {
    issues.push(
      `${Math.round(blankRatio * 100)}% of HTML lines are blank, suggesting unminified HTML`
    )
  }

  if (commentCount > COMMENT_COUNT_THRESHOLD) {
    issues.push(
      `${commentCount} HTML comments found in page source (excluding conditional comments, whitespace-only comments and React markers)`
    )
  }

  if (issues.length === 0) {
    return {
      guidelineId: '3.3',
      guidelineName: 'Minify Your HTML, CSS, and JavaScript',
      successCriterion: 'Served assets should be minified to reduce transfer size',
      status: 'pass',
      score: 100,
      message: 'HTML appears to be minified (low blank-line ratio, no excessive comments).',
      impact: 'medium',
      category: 'web-dev',
      machineTestable: true,
    }
  }

  return {
    guidelineId: '3.3',
    guidelineName: 'Minify Your HTML, CSS, and JavaScript',
    successCriterion: 'Served assets should be minified to reduce transfer size',
    status: 'warn',
    score: 50,
    message: 'HTML may not be minified.',
    details: issues.join('. '),
    recommendation:
      'Minify HTML, CSS, and JavaScript before serving them. Use build-time tools such as html-minifier-terser (HTML), cssnano (CSS), or esbuild / Terser (JS).',
    resources: [
      'https://www.w3.org/TR/web-sustainability-guidelines/#minify-your-html-css-and-javascript',
    ],
    impact: 'medium',
    category: 'web-dev',
    machineTestable: true,
  }
}
