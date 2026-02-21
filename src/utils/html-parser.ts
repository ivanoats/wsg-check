/**
 * HTML parser for wsg-check.
 *
 * Uses Cheerio to parse a raw HTML string into a structured representation
 * containing the elements most relevant to Web Sustainability checks:
 *   - Document metadata (<title>, <meta>, <link>)
 *   - Resource references (stylesheets, scripts, images, fonts, media)
 *   - Semantic structure (heading hierarchy, landmarks, ARIA attributes)
 *   - Structured data (JSON-LD)
 */

import * as cheerio from 'cheerio'
import type { Element as DomElement } from 'domhandler'
import { ParseError } from './errors.js'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface MetaTag {
  name?: string
  property?: string
  httpEquiv?: string
  charset?: string
  content?: string
}

export interface LinkRef {
  rel?: string
  href?: string
  type?: string
  media?: string
}

export type ResourceType = 'stylesheet' | 'script' | 'image' | 'font' | 'media' | 'other'

/** A reference to an external resource found in the page. */
export interface ResourceReference {
  type: ResourceType
  url: string
  /** All HTML attributes on the element, for deeper analysis by checks. */
  attributes: Record<string, string>
}

export interface HeadingNode {
  level: 1 | 2 | 3 | 4 | 5 | 6
  text: string
}

export interface StructuredData {
  /** The `@type` value from the JSON-LD object (or `"unknown"`). */
  type: string
  data: Record<string, unknown>
}

/**
 * Summary of a single form input (or select / textarea) found in the document.
 * Used by the form-validation check (WSG 3.12).
 */
export interface FormInputInfo {
  /** The effective input type (e.g. `"text"`, `"email"`, `"select"`, `"textarea"`). */
  type: string
  /** `true` when the input has an associated `<label>` element. */
  hasLabel: boolean
  /** `true` when the input carries an `autocomplete` attribute. */
  hasAutocomplete: boolean
  /** `true` when the input carries an `inputmode` attribute. */
  hasInputmode: boolean
}

/**
 * The fully parsed representation of a web page, ready for sustainability
 * checks.
 */
export interface ParsedPage {
  /** Inner text of the first `<title>` element, or `null`. */
  title: string | null
  /** `lang` attribute of the `<html>` element, or `null`. */
  lang: string | null
  metaTags: MetaTag[]
  /** All `<link>` elements in the document `<head>`. */
  links: LinkRef[]
  /** All external resource references found in the document. */
  resources: ResourceReference[]
  /** All heading elements in document order. */
  headings: HeadingNode[]
  /**
   * `true` when the document contains at least one skip-navigation link
   * (an `<a>` whose href starts with `#` and whose text/aria-label is
   * commonly associated with skipping navigation).
   */
  hasSkipLink: boolean
  /** Distinct landmark roles / semantic elements used as landmarks. */
  landmarks: string[]
  /** All unique `aria-*` attribute names found in the document. */
  ariaAttributes: string[]
  /** Parsed JSON-LD structured-data blocks. */
  structuredData: StructuredData[]
  /** Raw `<!DOCTYPE …>` declaration string, or `null` if absent. */
  doctype: string | null
  /**
   * Summary of each interactive form input (`<input>` excluding hidden,
   * `<select>`, `<textarea>`) found in the document.
   * Used by the form-validation check (WSG 3.12).
   */
  formInputs: FormInputInfo[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve a potentially relative URL against the page's base URL. */
function resolveUrl(href: string | undefined, baseUrl?: string): string {
  if (!href) return ''
  if (!baseUrl) return href
  try {
    return new URL(href, baseUrl).href
  } catch {
    return href
  }
}

/** Return all HTML attributes of a Cheerio element as a plain object. */
function attrsOf(el: DomElement): Record<string, string> {
  const result: Record<string, string> = {}
  // domhandler uses 'tag' for most elements, but 'script' and 'style' for
  // those specific element types – all three carry an `attribs` object.
  const attribs = (el as { attribs?: Record<string, string> }).attribs ?? {}
  for (const [k, v] of Object.entries(attribs)) {
    if (typeof v === 'string') result[k] = v
  }
  return result
}

/** Common skip-link text patterns (case-insensitive). */
const SKIP_LINK_PATTERNS = [
  /skip.*nav/i,
  /skip.*content/i,
  /skip.*main/i,
  /jump.*content/i,
  /go.*main/i,
]

/** HTML elements that inherently represent ARIA landmark roles. */
const LANDMARK_ELEMENTS = new Set(['header', 'nav', 'main', 'aside', 'footer', 'section', 'form'])

/** Explicit ARIA role values that are landmark roles. */
const LANDMARK_ROLES = new Set([
  'banner',
  'navigation',
  'main',
  'complementary',
  'contentinfo',
  'search',
  'form',
  'region',
])

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Parse an HTML string and return the structured `ParsedPage` representation.
 *
 * @param html     Raw HTML source string.
 * @param baseUrl  Optional base URL used to resolve relative resource paths.
 *
 * @throws {ParseError} When Cheerio cannot load the HTML at all.
 */
export function parseHtml(html: string, baseUrl?: string): ParsedPage {
  let $: cheerio.CheerioAPI
  try {
    $ = cheerio.load(html)
  } catch (err) {
    throw new ParseError('Failed to parse HTML', err)
  }

  // ── Doctype ────────────────────────────────────────────────────────────────
  let doctype: string | null = null
  $.root()
    .contents()
    .each((_, node) => {
      if (
        node.type === 'directive' &&
        (node as { data?: string }).data?.toLowerCase().startsWith('!doctype')
      ) {
        doctype = `<!${(node as { data?: string }).data ?? ''}>`
      }
    })

  // ── Title ──────────────────────────────────────────────────────────────────
  const title = $('title').first().text().trim() || null

  // ── Lang ──────────────────────────────────────────────────────────────────
  const lang = $('html').attr('lang') ?? null

  // ── Meta tags ─────────────────────────────────────────────────────────────
  const metaTags: MetaTag[] = []
  $('head meta').each((_, el) => {
    const attrs = attrsOf(el as DomElement)
    const tag: MetaTag = {}
    if (attrs.name) tag.name = attrs.name
    if (attrs.property) tag.property = attrs.property
    if (attrs['http-equiv']) tag.httpEquiv = attrs['http-equiv']
    if (attrs.charset) tag.charset = attrs.charset
    if (attrs.content) tag.content = attrs.content
    metaTags.push(tag)
  })

  // ── Link elements ─────────────────────────────────────────────────────────
  const links: LinkRef[] = []
  $('head link').each((_, el) => {
    const attrs = attrsOf(el as DomElement)
    links.push({
      rel: attrs.rel,
      href: attrs.href,
      type: attrs.type,
      media: attrs.media,
    })
  })

  // ── Resources ─────────────────────────────────────────────────────────────
  const resources: ResourceReference[] = []

  // Stylesheets via <link rel="stylesheet">
  $('link[rel="stylesheet"]').each((_, el) => {
    const attrs = attrsOf(el as DomElement)
    const url = resolveUrl(attrs.href, baseUrl)
    if (url) {
      resources.push({ type: 'stylesheet', url, attributes: attrs })
    }
  })

  // Scripts via <script src>
  $('script[src]').each((_, el) => {
    const attrs = attrsOf(el as DomElement)
    const url = resolveUrl(attrs.src, baseUrl)
    if (url) {
      resources.push({ type: 'script', url, attributes: attrs })
    }
  })

  // Images via <img src>
  $('img').each((_, el) => {
    const attrs = attrsOf(el as DomElement)
    const imageUrls = new Set<string>()

    const url = resolveUrl(attrs.src, baseUrl)
    if (url) {
      imageUrls.add(url)
      resources.push({ type: 'image', url, attributes: attrs })
    }
    // Also handle srcset; skip any URL already added via src
    if (attrs.srcset) {
      for (const part of attrs.srcset.split(',')) {
        const candidate = part.trim().split(/\s+/)[0]
        const srcUrl = resolveUrl(candidate, baseUrl)
        if (srcUrl && !imageUrls.has(srcUrl)) {
          imageUrls.add(srcUrl)
          resources.push({ type: 'image', url: srcUrl, attributes: { srcset: attrs.srcset } })
        }
      }
    }
  })

  // Fonts and other preloads via <link rel="preload">
  $('link[rel="preload"]').each((_, el) => {
    const attrs = attrsOf(el as DomElement)
    const url = resolveUrl(attrs.href, baseUrl)
    if (!url) return
    const as = attrs.as?.toLowerCase()
    const type: ResourceType =
      as === 'font'
        ? 'font'
        : as === 'script'
          ? 'script'
          : as === 'style'
            ? 'stylesheet'
            : as === 'image'
              ? 'image'
              : 'other'
    resources.push({ type, url, attributes: attrs })
  })

  // Media elements (<video>, <audio>, <source>)
  $('video[src], audio[src], source[src]').each((_, el) => {
    const attrs = attrsOf(el as DomElement)
    const url = resolveUrl(attrs.src, baseUrl)
    if (url) {
      resources.push({ type: 'media', url, attributes: attrs })
    }
  })

  // ── Headings ──────────────────────────────────────────────────────────────
  const headings: HeadingNode[] = []
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = (el as DomElement).name
    const level = parseInt(tag.slice(1), 10) as HeadingNode['level']
    headings.push({ level, text: $(el).text().trim() })
  })

  // ── Skip link ─────────────────────────────────────────────────────────────
  let hasSkipLink = false
  $('a[href^="#"]').each((_, el) => {
    const text = $(el).text().trim()
    const ariaLabel = (el as DomElement).attribs?.['aria-label'] ?? ''
    if (SKIP_LINK_PATTERNS.some((re) => re.test(text) || re.test(ariaLabel))) {
      hasSkipLink = true
    }
  })

  // ── Landmarks ─────────────────────────────────────────────────────────────
  const landmarkSet = new Set<string>()

  LANDMARK_ELEMENTS.forEach((tag) => {
    if ($(tag).length > 0) landmarkSet.add(tag)
  })

  $('[role]').each((_, el) => {
    const role = (el as DomElement).attribs?.role?.toLowerCase()
    if (role && LANDMARK_ROLES.has(role)) landmarkSet.add(role)
  })

  const landmarks = [...landmarkSet].sort()

  // ── ARIA attributes ───────────────────────────────────────────────────────
  const ariaSet = new Set<string>()
  $('*').each((_, el) => {
    for (const attr of Object.keys((el as DomElement).attribs ?? {})) {
      if (attr.startsWith('aria-')) ariaSet.add(attr)
    }
  })
  const ariaAttributes = [...ariaSet].sort()

  // ── Structured data (JSON-LD) ─────────────────────────────────────────────
  const structuredData: StructuredData[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).text()
      const parsed = JSON.parse(raw) as Record<string, unknown>
      structuredData.push({
        type: typeof parsed['@type'] === 'string' ? parsed['@type'] : 'unknown',
        data: parsed,
      })
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  })

  // ── Form inputs ───────────────────────────────────────────────────────────
  // Build a set of input IDs that are targeted by a <label for="..."> element.
  const labelledByFor = new Set<string>()
  $('label[for]').each((_, el) => {
    const forAttr = (el as DomElement).attribs?.for
    if (forAttr) labelledByFor.add(forAttr)
  })

  const formInputs: FormInputInfo[] = []
  $('input:not([type="hidden"]), select, textarea').each((_, el) => {
    const attrs = attrsOf(el as DomElement)
    const tagName = (el as DomElement).name
    const type = attrs.type ?? (tagName === 'select' ? 'select' : 'textarea')
    const id = attrs.id

    // An input is labelled when:
    //   (a) it has an id and a matching <label for="[id]"> exists, or
    //   (b) it is a descendant of a <label> element.
    const hasLabel =
      (id !== undefined && labelledByFor.has(id)) || $(el).closest('label').length > 0

    formInputs.push({
      type,
      hasLabel,
      hasAutocomplete: 'autocomplete' in attrs,
      hasInputmode: 'inputmode' in attrs,
    })
  })

  return {
    title,
    lang,
    metaTags,
    links,
    resources,
    headings,
    hasSkipLink,
    landmarks,
    ariaAttributes,
    structuredData,
    doctype,
    formInputs,
  }
}
