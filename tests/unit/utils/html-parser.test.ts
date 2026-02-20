import { describe, it, expect } from 'vitest'
import { parseHtml } from '@/utils/html-parser'

const MINIMAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Test Page</title>
  <meta name="description" content="A test page" />
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="/styles.css" />
  <link rel="preload" href="/fonts/main.woff2" as="font" crossorigin />
</head>
<body>
  <a href="#main-content">Skip to main content</a>
  <header>
    <nav aria-label="Main navigation">
      <a href="/">Home</a>
    </nav>
  </header>
  <main id="main-content" aria-labelledby="page-title">
    <h1 id="page-title">Hello World</h1>
    <h2>Section One</h2>
    <img src="/images/hero.jpg" alt="Hero image" />
    <img src="/images/logo.png" srcset="/images/logo@2x.png 2x" alt="Logo" />
  </main>
  <footer>
    <p>Footer content</p>
  </footer>
  <script src="/app.js" defer></script>
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"WebPage","name":"Test Page"}
  </script>
</body>
</html>`

describe('parseHtml – basic fields', () => {
  const page = parseHtml(MINIMAL_HTML)

  it('extracts the document title', () => {
    expect(page.title).toBe('Test Page')
  })

  it('extracts the html lang attribute', () => {
    expect(page.lang).toBe('en')
  })

  it('detects the DOCTYPE declaration', () => {
    expect(page.doctype).not.toBeNull()
    expect(page.doctype?.toLowerCase()).toContain('doctype')
  })
})

describe('parseHtml – meta tags', () => {
  const page = parseHtml(MINIMAL_HTML)

  it('parses meta name/content pairs', () => {
    const desc = page.metaTags.find((m) => m.name === 'description')
    expect(desc?.content).toBe('A test page')
  })

  it('parses meta charset', () => {
    const charset = page.metaTags.find((m) => m.charset)
    expect(charset?.charset).toBe('UTF-8')
  })
})

describe('parseHtml – links', () => {
  const page = parseHtml(MINIMAL_HTML)

  it('collects <link rel="stylesheet">', () => {
    const stylesheet = page.links.find((l) => l.rel === 'stylesheet')
    expect(stylesheet?.href).toBe('/styles.css')
  })
})

describe('parseHtml – resources', () => {
  const page = parseHtml(MINIMAL_HTML, 'https://example.com')

  it('identifies stylesheet resources', () => {
    const css = page.resources.filter((r) => r.type === 'stylesheet')
    expect(css.length).toBeGreaterThan(0)
  })

  it('identifies script resources', () => {
    const scripts = page.resources.filter((r) => r.type === 'script')
    expect(scripts.length).toBeGreaterThan(0)
  })

  it('identifies image resources', () => {
    const images = page.resources.filter((r) => r.type === 'image')
    expect(images.length).toBeGreaterThan(0)
  })

  it('identifies font preload resources', () => {
    const fonts = page.resources.filter((r) => r.type === 'font')
    expect(fonts.length).toBeGreaterThan(0)
  })

  it('resolves relative URLs to absolute when baseUrl is provided', () => {
    const img = page.resources.find((r) => r.url.includes('hero.jpg'))
    expect(img?.url).toBe('https://example.com/images/hero.jpg')
  })
})

describe('parseHtml – headings', () => {
  const page = parseHtml(MINIMAL_HTML)

  it('collects all heading elements in order', () => {
    expect(page.headings[0].level).toBe(1)
    expect(page.headings[0].text).toBe('Hello World')
    expect(page.headings[1].level).toBe(2)
    expect(page.headings[1].text).toBe('Section One')
  })
})

describe('parseHtml – skip link', () => {
  it('detects a skip-to-main-content link', () => {
    const page = parseHtml(MINIMAL_HTML)
    expect(page.hasSkipLink).toBe(true)
  })

  it('returns false when no skip link is present', () => {
    const html = `<html><body><a href="#other">Other</a></body></html>`
    const page = parseHtml(html)
    expect(page.hasSkipLink).toBe(false)
  })
})

describe('parseHtml – landmarks', () => {
  const page = parseHtml(MINIMAL_HTML)

  it('detects semantic landmark elements', () => {
    expect(page.landmarks).toContain('header')
    expect(page.landmarks).toContain('nav')
    expect(page.landmarks).toContain('main')
    expect(page.landmarks).toContain('footer')
  })
})

describe('parseHtml – ARIA attributes', () => {
  const page = parseHtml(MINIMAL_HTML)

  it('collects unique aria-* attribute names', () => {
    expect(page.ariaAttributes).toContain('aria-label')
    expect(page.ariaAttributes).toContain('aria-labelledby')
  })
})

describe('parseHtml – structured data', () => {
  const page = parseHtml(MINIMAL_HTML)

  it('parses JSON-LD structured data', () => {
    expect(page.structuredData.length).toBeGreaterThan(0)
    expect(page.structuredData[0].type).toBe('WebPage')
  })
})

describe('parseHtml – edge cases', () => {
  it('handles an empty document gracefully', () => {
    const page = parseHtml('')
    expect(page.title).toBeNull()
    expect(page.lang).toBeNull()
    expect(page.resources).toEqual([])
    expect(page.headings).toEqual([])
  })

  it('handles HTML without a lang attribute', () => {
    const page = parseHtml('<html><head></head><body></body></html>')
    expect(page.lang).toBeNull()
  })

  it('handles HTML without a title element', () => {
    const page = parseHtml('<html><head></head><body></body></html>')
    expect(page.title).toBeNull()
  })

  it('ignores malformed JSON-LD blocks', () => {
    const html = `<script type="application/ld+json">{invalid json}</script>`
    const page = parseHtml(html)
    expect(page.structuredData).toEqual([])
  })
})

describe('parseHtml – media resources', () => {
  it('identifies video resources', () => {
    const html = `<html><body><video src="/clip.mp4"></video></body></html>`
    const page = parseHtml(html, 'https://example.com')
    const media = page.resources.filter((r) => r.type === 'media')
    expect(media.length).toBeGreaterThan(0)
    expect(media[0].url).toBe('https://example.com/clip.mp4')
  })

  it('identifies audio resources', () => {
    const html = `<html><body><audio src="/track.mp3"></audio></body></html>`
    const page = parseHtml(html, 'https://example.com')
    const media = page.resources.filter((r) => r.type === 'media')
    expect(media.length).toBeGreaterThan(0)
  })

  it('identifies source elements inside video', () => {
    const html = `<html><body><video><source src="/clip.webm" /></video></body></html>`
    const page = parseHtml(html, 'https://example.com')
    const media = page.resources.filter((r) => r.type === 'media')
    expect(media.length).toBeGreaterThan(0)
  })
})

describe('parseHtml – ARIA role landmarks', () => {
  it('detects elements with explicit landmark role attributes', () => {
    const html = `<html><body><div role="navigation">Nav</div><div role="main">Main</div></body></html>`
    const page = parseHtml(html)
    expect(page.landmarks).toContain('navigation')
    expect(page.landmarks).toContain('main')
  })

  it('detects skip link via aria-label', () => {
    const html = `<html><body><a href="#content" aria-label="Skip navigation">x</a></body></html>`
    const page = parseHtml(html)
    expect(page.hasSkipLink).toBe(true)
  })
})

describe('parseHtml – preload resource types', () => {
  it('classifies preload with as="script" as script', () => {
    const html = `<html><head><link rel="preload" href="/app.js" as="script"></head></html>`
    const page = parseHtml(html, 'https://example.com')
    const scripts = page.resources.filter((r) => r.type === 'script')
    expect(scripts.length).toBeGreaterThan(0)
  })

  it('classifies preload with as="style" as stylesheet', () => {
    const html = `<html><head><link rel="preload" href="/main.css" as="style"></head></html>`
    const page = parseHtml(html, 'https://example.com')
    const css = page.resources.filter((r) => r.type === 'stylesheet')
    expect(css.length).toBeGreaterThan(0)
  })

  it('classifies preload with as="image" as image', () => {
    const html = `<html><head><link rel="preload" href="/hero.jpg" as="image"></head></html>`
    const page = parseHtml(html, 'https://example.com')
    const imgs = page.resources.filter((r) => r.type === 'image')
    expect(imgs.length).toBeGreaterThan(0)
  })

  it('classifies preload with unknown as value as other', () => {
    const html = `<html><head><link rel="preload" href="/data.json" as="fetch"></head></html>`
    const page = parseHtml(html, 'https://example.com')
    const other = page.resources.filter((r) => r.type === 'other')
    expect(other.length).toBeGreaterThan(0)
  })
})

describe('parseHtml – resolveUrl edge cases', () => {
  it('returns href unchanged when URL construction fails', () => {
    // A URL that's invalid but cheerio will still put it as an href
    const html = `<html><body><img src="://bad-url" /></body></html>`
    // Should not throw even with an invalid URL
    expect(() => parseHtml(html, 'https://example.com')).not.toThrow()
  })

  it('returns href as-is when no baseUrl is provided', () => {
    const html = `<html><head><link rel="stylesheet" href="/styles.css" /></head></html>`
    const page = parseHtml(html)
    const css = page.resources.find((r) => r.type === 'stylesheet')
    expect(css?.url).toBe('/styles.css')
  })
})
