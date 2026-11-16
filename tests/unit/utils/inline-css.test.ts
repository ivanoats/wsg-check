import { describe, it, expect } from 'vitest'
import { extractInlineCss, linksExternalCss, stripCssComments } from '@/utils/inline-css'
import type { ResourceReference } from '@/utils/html-parser'

describe('stripCssComments', () => {
  it.each([
    ['a single comment', 'a { color: red } /* note */ b {}', 'a { color: red }  b {}'],
    ['several comments', '/* 1 */a{}/* 2 */b{}', 'a{}b{}'],
    ['an unterminated comment, to the end', 'a{} /* open', 'a{} '],
    ['a comment that contains quotes', 'a{} /* "x */ b{}', 'a{}  b{}'],
  ])('removes %s', (_, css, expected) => {
    expect(stripCssComments(css)).toBe(expected)
  })

  it.each([
    ['double quotes', 'pre::before { content: "/*"; } @media (max-width: 1px) {} /* c */'],
    ['single quotes', "pre::before { content: '/*'; } @media (max-width: 1px) {} /* c */"],
    ['an escaped quote', 'a::before { content: "\\"/*"; } @media (max-width: 1px) {} /* c */'],
    ['a url string', 'a { background: url("/a/*b.png"); } @media (max-width: 1px) {} /* c */'],
  ])('keeps a /* inside %s and the rules after it', (_, css) => {
    const stripped = stripCssComments(css)
    expect(stripped).toContain('@media (max-width: 1px)')
    expect(stripped).not.toContain('/* c */')
  })

  it('ends an unterminated string at the line end', () => {
    expect(stripCssComments('a { content: "oops\n} /* c */ b {}')).toBe(
      'a { content: "oops\n}  b {}'
    )
  })
})

describe('extractInlineCss', () => {
  it('joins every <style> block, comments removed, without the HTML between them', () => {
    const body =
      '<style>a{} /* x */</style><p>@media in page text</p><style media="print">b{}</style>'
    expect(extractInlineCss(body)).toBe('a{} \nb{}')
  })

  it('returns an empty string without <style> blocks', () => {
    expect(extractInlineCss('<p>no styles</p>')).toBe('')
  })
})

describe('linksExternalCss', () => {
  const stylesheet: ResourceReference = {
    type: 'stylesheet',
    url: 'https://example.com/s.css',
    attributes: { rel: 'stylesheet', href: '/s.css' },
  }
  const stylePreload: ResourceReference = {
    type: 'stylesheet',
    url: 'https://example.com/s.css',
    attributes: { rel: 'preload', as: 'style', href: '/s.css' },
  }

  it('is true for a <link rel="stylesheet">', () => {
    expect(linksExternalCss([stylesheet], '')).toBe(true)
  })

  it('is false for a <link rel="preload" as="style"> alone', () => {
    expect(linksExternalCss([stylePreload], '')).toBe(false)
  })

  it.each(['@import url("/s.css");', "@import '/s.css';", '@import url(/s.css);'])(
    'is true for an inline %s',
    (css) => {
      expect(linksExternalCss([], css)).toBe(true)
    }
  )

  it('is false for the word @import without a URL', () => {
    expect(linksExternalCss([], 'a::before { content: "@import" }')).toBe(false)
  })
})
