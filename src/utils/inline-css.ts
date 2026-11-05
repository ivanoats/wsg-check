/**
 * Inline CSS helpers for checks that search `<style>` blocks. External
 * stylesheets are never fetched, so these see only the CSS in the HTML.
 */

import type { ResourceReference } from './html-parser'

/** `<style>` block extractor. */
const STYLE_BLOCK_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gi

// An inline `@import` pulls in external CSS the parser does not list as a resource.
// It accepts both the bare-string and url(...) forms, quoted or unquoted.
const QUOTED_STRING = String.raw`"[^"]*"|'[^']*'`
const URL_FUNCTION = String.raw`url\(\s*(?:${QUOTED_STRING}|[^\s)]+)\s*\)`
const CSS_IMPORT_PATTERN = new RegExp(
  String.raw`@import\s*(?:${URL_FUNCTION}|${QUOTED_STRING})`,
  'i'
)

/** End of a quoted string starting at `start`: its closing quote, a newline, or the end of the CSS. */
const stringEnd = (css: string, start: number): number => {
  const quote = css[start]
  let i = start + 1
  while (i < css.length && css[i] !== quote && css[i] !== '\n') {
    i += css[i] === '\\' ? 2 : 1
  }
  return Math.min(i + 1, css.length)
}

/**
 * Removes `/* … *\/` comments but leaves quoted strings alone, so the `/*` in
 * `content: "/*"` does not swallow the rules after it. As in CSS, an
 * unterminated comment runs to the end and an unterminated string to the line end.
 */
export const stripCssComments = (css: string): string => {
  const kept: string[] = []
  let from = 0
  let i = 0
  while (i < css.length) {
    const ch = css[i]
    if (ch === '"' || ch === "'") {
      i = stringEnd(css, i)
    } else if (ch === '/' && css[i + 1] === '*') {
      kept.push(css.slice(from, i))
      const close = css.indexOf('*/', i + 2)
      i = close === -1 ? css.length : close + 2
      from = i
    } else {
      i++
    }
  }
  kept.push(css.slice(from))
  return kept.join('')
}

/**
 * The contents of every inline `<style>` block, comments removed, joined by
 * newlines. Each block is searched on its own, so a pattern cannot span
 * `</style>…<style>` and match page text, and a commented-out rule never counts.
 */
export const extractInlineCss = (body: string): string =>
  Array.from(body.matchAll(STYLE_BLOCK_PATTERN), (m) => stripCssComments(m[1])).join('\n')

/**
 * `true` when the page loads CSS that is not analysed: a `<link rel="stylesheet">`
 * (not a `rel="preload"` hint) or an `@import` in `inlineCss`.
 */
export const linksExternalCss = (
  resources: ReadonlyArray<ResourceReference>,
  inlineCss: string
): boolean =>
  resources.some(
    (r) => r.type === 'stylesheet' && r.attributes.rel?.toLowerCase() === 'stylesheet'
  ) || CSS_IMPORT_PATTERN.test(inlineCss)
