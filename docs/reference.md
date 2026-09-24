# Module and Check Reference

[Documentation index](README.md) · [Architecture](architecture.md)

This reference describes the source tree, including unreleased July-2026 spec support. Check thresholds are implementation heuristics, not W3C certification criteria.

## Utils Module

Located in `src/utils/`, this module provides the shared building blocks consumed by the Core, Checks, and CLI modules.

### `http-client.ts` — HTTP Client

A configurable, sustainability-aware HTTP client built on [Axios](https://axios-http.com/).

**Features:**

- **In-memory caching** — duplicate fetches for the same URL within a session are served from cache.
- **Retry with back-off** — transient network errors are retried up to `maxRetries` times with an exponential delay.
- **robots.txt support (WSG 4.6)** — fetches and caches the target site's `robots.txt` before making requests; returns an error `Result` containing `FetchError` if the crawler is disallowed.
- **Redirect chain tracking (WSG 4.4)** — follows redirects manually so every hop is recorded in `FetchResult.redirectChain`.

```typescript
import { HttpClient } from '@/utils'

const client = new HttpClient({ timeout: 15_000, userAgent: 'my-bot/1.0' })
const result = await client.fetch('https://example.com')
if (result.ok) {
  console.log(result.value.redirectChain, result.value.headers)
} else {
  console.error(result.error.message)
}
```

### `html-parser.ts` — HTML Parser

Parses raw HTML into a structured `ParsedPage` object using [Cheerio](https://cheerio.js.org/).

**Extracts:**

- Document metadata: `<title>`, `lang`, `<meta>` tags, `<link>` elements
- Resource references: stylesheets, scripts, images (including `srcset`), fonts (preloads), media
- Semantic structure: heading hierarchy, landmark elements, ARIA attributes
- Accessibility signals: skip-navigation links
- Structured data: JSON-LD blocks
- Form inputs: `formInputs` array — each entry captures the input `type`, whether it has a `<label>` (`hasLabel`), and whether it carries an `autocomplete` attribute (`hasAutocomplete`)

```typescript
import { parseHtml } from '@/utils'

const page = parseHtml(htmlString, 'https://example.com')
// page.title, page.resources, page.headings, page.landmarks …
```

### `resource-analyzer.ts` — Resource Analyzer

Aggregates resource data into sustainability metrics.

**Provides:**

- `classifyResources()` — labels each resource as first-party or third-party.
- `analyzeCompression()` — detects gzip / brotli / zstd from response headers.
- `analyzePageWeight()` — returns `htmlSize`, `resourceCount`, first/third-party split, compression info, and per-type counts.

### `carbon-estimator.ts` — Carbon Estimator

Estimates CO2 emissions per page view using the [CO2.js](https://www.thegreenwebfoundation.org/co2-js/) library (Sustainable Web Design v4 model) and checks whether a domain is served from renewable energy via the [Green Web Foundation API](https://www.thegreenwebfoundation.org/tools/green-web-dataset/).

**Provides:**

- `estimateCO2(bytes, isGreenHosted)` — pure function; returns grams of CO2 rounded to 4 decimal places.
- `checkGreenHosting(domain)` — async; queries the Green Web Foundation API and returns `boolean`. Falls back to `false` on network errors so the pipeline is never blocked.
- `CO2_MODEL` — string constant `'swd-v4'` exposed as the `co2Model` field in `RunResult`.

```typescript
import { estimateCO2, checkGreenHosting, CO2_MODEL } from '@/utils'

const isGreen = await checkGreenHosting('example.com')
const grams = estimateCO2(pageWeight.htmlSize, isGreen)
// grams: e.g. 0.0012 (rounded to 4 d.p.)
// CO2_MODEL: 'swd-v4'
```

### `errors.ts` — Custom Error Classes

| Class         | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `FetchError`  | Network or HTTP-level failures; carries the offending `url`.            |
| `ParseError`  | HTML or document parsing failures.                                      |
| `ConfigError` | Invalid or incomplete configuration; optionally carries a `field` name. |
| `CheckError`  | Individual check runtime failures; carries the `guidelineId`.           |

All classes extend `Error` and preserve the `cause` chain where applicable, enabling graceful degradation: a `CheckError` from one check is caught by the runner and recorded without aborting the remaining checks.

### `logger.ts` — Logger

A lightweight structured logger supporting two output modes:

| Mode                 | Output                                           | Suitable for          |
| -------------------- | ------------------------------------------------ | --------------------- |
| `terminal` (default) | `[INFO] message`                                 | CLI                   |
| `structured`         | `{"level":"info","message":"…","timestamp":"…"}` | API / log aggregators |

```typescript
import { createLogger } from '@/utils'

const log = createLogger({ level: 'debug', structured: false })
log.info('Fetching URL', { url: 'https://example.com' })
```

## Checks Module (`src/checks/`)

Checks accept `PageData` and return a `CheckResult` or a promise. Most inspect static page data; `checkSustainableHosting` performs external I/O through `checkGreenHosting`. The registered check arrays wrap results with the pinned spec identity or a related-check ID; use those arrays for the standard pipeline. See [Architecture](architecture.md).

### Performance & Efficiency Checks

| Check                 | File                 | Guideline (WSG July-2026)                            | Impact |
| --------------------- | -------------------- | ---------------------------------------------------- | ------ |
| `checkMinification`   | `minification.ts`    | 3.2 Minify and remove unused code                    | medium |
| `checkRenderBlocking` | `render-blocking.ts` | 3.7 Defer the loading of non-critical resources      | high   |
| `checkPageWeight`     | `page-weight.ts`     | 3.1 Set goals based on performance and energy impact | medium |

#### `checkMinification` — WSG 3.2

Detects signals of unminified HTML in the served response using two heuristics applied to the raw HTML body:

1. **Blank-line ratio**: if more than 10% of lines are whitespace-only, the HTML is likely not minified.
2. **HTML comment count**: more than 2 non-conditional HTML comments suggest developer source (conditional `<!--[if …]>` comments are excluded).

> **Note:** External CSS and JS file content is not fetched during static analysis, so minification of those assets cannot be verified in this phase.

#### `checkRenderBlocking` — WSG 3.7

Checks for two common sources of render-blocking behaviour:

1. **Scripts without `async` or `defer`** — blocks the HTML parser until the script downloads and executes.
2. **Images without `loading="lazy"`** — forces eager-loading of all images regardless of viewport position.

Scoring:

| Condition                              | Status           | Score |
| -------------------------------------- | ---------------- | ----- |
| Render-blocking scripts present        | `fail`           | 0     |
| Scripts OK, some images lack lazy-load | `warn`           | 50    |
| All scripts deferred, all images lazy  | `pass`           | 100   |
| No scripts or images on the page       | `not-applicable` | —     |

#### `checkPageWeight` — WSG 3.1

Checks the HTML document size and total referenced resource count against sustainability-driven performance budgets. Static analysis only — external resource sizes are not individually fetched.

| Condition                        | Status | Score |
| -------------------------------- | ------ | ----- |
| HTML > 500 KB or resources > 100 | `fail` | 0     |
| HTML > 100 KB or resources > 50  | `warn` | 50    |
| Within both budgets              | `pass` | 100   |

### Semantic & Standards Checks

| Check                    | File                    | Guideline (WSG July-2026)                          | Impact |
| ------------------------ | ----------------------- | -------------------------------------------------- | ------ |
| `checkSemanticHtml`      | `semantic-html.ts`      | 3.6 Ensure code follows good semantic practices    | medium |
| `checkAccessibilityAids` | `accessibility-aids.ts` | 2.4 Design efficient and streamlined user journeys | medium |
| `checkFormValidation`    | `form-validation.ts`    | Related: Form validation (not scored)              | medium |
| `checkMetadata`          | `metadata.ts`           | 3.8 Structure metadata for machine readability     | low    |
| `checkStructuredData`    | `metadata.ts`           | 3.8 Structure metadata for machine readability     | low    |

#### `checkSemanticHtml` — WSG 3.6

Validates semantic HTML structure across three areas:

1. **Document language** — the `<html>` element must declare a `lang` attribute.
2. **Heading hierarchy** — headings must not skip levels (e.g., `h1 → h3`), and the page should have exactly one `<h1>`.
3. **Native elements over custom implementations** — detects `<div role="button">` and similar patterns that should use native `<button>`, `<a>`, or `<input>` elements instead.

#### `checkAccessibilityAids` — WSG 2.4

Checks for way-finding mechanisms that allow keyboard and screen-reader users to navigate efficiently:

1. **Skip navigation link** — an `<a href="#…">` that lets users bypass repeated navigation blocks. Required when a `<nav>` landmark is present.
2. **`<main>` landmark** — identifies the primary content region for assistive technology.

| Condition                           | Status           | Score |
| ----------------------------------- | ---------------- | ----- |
| Nav present, no skip link           | `fail`           | 0     |
| Missing `<main>` landmark only      | `warn`           | 50    |
| Skip link and `<main>` both present | `pass`           | 100   |
| No navigation structure             | `not-applicable` | —     |

#### `checkFormValidation` — Related `form-validation` (not scored)

Checks that form inputs use accessible and efficient HTML patterns:

1. **Labels** — every `<input>`, `<select>`, and `<textarea>` must have an associated `<label>` (via `for`/`id` pairing or nesting).
2. **Autocomplete** — at least one input should carry an `autocomplete` attribute to enable browser/password manager pre-fill.

| Condition                           | Status           | Score |
| ----------------------------------- | ---------------- | ----- |
| Any input missing a label           | `fail`           | 0     |
| Labels present, autocomplete absent | `warn`           | 50    |
| All labelled, autocomplete used     | `pass`           | 100   |
| No form inputs found                | `not-applicable` | —     |

#### `checkMetadata` — WSG 3.8

Validates essential page metadata that enables accurate search-engine previews and social-media cards:

- `<title>` element (required)
- `<meta name="description">` (required)
- Open Graph tags `og:title` and `og:description` (recommended)

Missing title or description → `fail`; missing Open Graph only → `warn`.

#### `checkStructuredData` — WSG 3.8

Checks for Schema.org JSON-LD structured data that enables rich search results, reducing the number of clicks users need to find information:

- No JSON-LD blocks found → `warn` (50)
- One or more valid JSON-LD blocks → `pass` (100)

### Sustainability-Specific Checks

| Check                         | File                          | Guideline (WSG July-2026)                                       | Impact |
| ----------------------------- | ----------------------------- | --------------------------------------------------------------- | ------ |
| `checkCssRedundancy`          | `redundancy.ts`               | 3.4 Avoid redundancy and duplication in code                    | medium |
| `checkThirdParty`             | `third-party.ts`              | 3.5 Treat third parties the same as first parties               | high   |
| `checkPreferenceMediaQueries` | `preference-media-queries.ts` | 3.9 Use media queries that support sustainability goals         | medium |
| `checkResponsiveDesign`       | `responsive-design.ts`        | 3.10 Ensure layouts work for different devices and requirements | medium |
| `checkSustainableJs`          | `sustainable-js.ts`           | 3.11 Use sustainable JavaScript and APIs                        | medium |

#### `checkCssRedundancy` — WSG 3.4

Detects CSS redundancy signals observable from the HTML document:

1. **Repeated inline `style` attribute values** — when the same `style="…"` value appears 3+ times it should be extracted into a reusable CSS class.
2. **Multiple inline `<style>` blocks** — more than one `<style>` element should be consolidated into a single external stylesheet for caching.

#### `checkThirdParty` — WSG 3.5

Counts third-party scripts loaded by the page. Each third-party script adds a network round-trip, may set tracking cookies, and can load additional sub-resources beyond the author's control.

| Condition               | Status | Score |
| ----------------------- | ------ | ----- |
| 0 third-party scripts   | `pass` | 100   |
| 1–5 third-party scripts | `warn` | 50    |
| 6+ third-party scripts  | `fail` | 0     |

#### `checkPreferenceMediaQueries` — WSG 3.9

Checks for `prefers-color-scheme`, `prefers-reduced-motion`, and `prefers-reduced-data` CSS media queries. These signals indicate support for user preferences; this static check does not measure energy savings.

#### `checkResponsiveDesign` — WSG 3.10

Checks for a `<meta name="viewport">` tag, responsive images (any `<img>` with `srcset`), and at least one CSS media query in inline styles or style blocks.

#### `checkSustainableJs` — WSG 3.11

Detects signals of unnecessary JavaScript: external script count, `document.write()` usage, and large inline script blocks.

| Condition                            | Status           | Score |
| ------------------------------------ | ---------------- | ----- |
| `document.write()` detected          | `fail`           | 0     |
| > 14 external scripts                | `fail`           | 0     |
| > 9 external scripts or large inline | `warn`           | 50    |
| All checks pass                      | `pass`           | 100   |
| No scripts on the page               | `not-applicable` | —     |

### Security & Maintenance Checks

| Check                  | File                  | Guideline (WSG July-2026)                         | Impact |
| ---------------------- | --------------------- | ------------------------------------------------- | ------ |
| `checkSecurityHeaders` | `security-headers.ts` | Related: Security headers (not scored)            | high   |
| `checkDependencyCount` | `dependency-count.ts` | 3.12 Use dependencies sparingly and maintain them | high   |
| `checkExpectedFiles`   | `expected-files.ts`   | 3.13 Include expected and beneficial files        | medium |
| `checkBeneficialFiles` | `expected-files.ts`   | 3.13 Include expected and beneficial files        | low    |
| `checkHtmlVersion`     | `html-version.ts`     | 3.15 Use the latest stable language version       | medium |

#### `checkSecurityHeaders` — Related `security-headers` (not scored)

Checks that the page is served with five recommended HTTP security headers. From a sustainability perspective, compromised pages cause unnecessary traffic (spam, malware distribution) and erode user trust.

Headers checked: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.

| Condition             | Status | Score |
| --------------------- | ------ | ----- |
| All 5 headers present | `pass` | 100   |
| 1–2 headers missing   | `warn` | 50    |
| 3+ headers missing    | `fail` | 0     |

#### `checkDependencyCount` — WSG 3.12

Counts the total number of third-party resources (scripts, stylesheets, images, fonts, media) loaded by the page. Each external dependency adds network round-trips and attack surface.

| Condition                 | Status | Score |
| ------------------------- | ------ | ----- |
| 0 third-party resources   | `pass` | 100   |
| 1–9 third-party resources | `warn` | 50    |
| 10+ third-party resources | `fail` | 0     |

#### `checkExpectedFiles` — WSG 3.13 (Expected)

Checks that the page's HTML `<head>` links to three standard files that browsers and search engines rely on:

- **Favicon** — `<link rel="icon">` (or `rel="shortcut icon"`, `rel="apple-touch-icon"`)
- **Web App Manifest** — `<link rel="manifest">`
- **Sitemap** — `<link rel="sitemap">`

Missing all three → `fail`; partially missing → `warn`.

#### `checkBeneficialFiles` — WSG 3.13 (Beneficial)

Encourages voluntary disclosure files that improve transparency:

- **`security.txt`** — vulnerability disclosure contact info (RFC 9116)
- **`humans.txt`** — credits the people who built the site
- **`carbon.txt`** — discloses sustainable hosting details

All missing → `warn` (these are nice-to-have, not required, so the maximum severity is `warn`).

#### `checkHtmlVersion` — WSG 3.15

Checks that the document uses the HTML5 standard and avoids deprecated elements:

1. **DOCTYPE** — must be `<!DOCTYPE html>` (HTML5 short form). Legacy or XHTML doctypes trigger `warn`.
2. **Deprecated elements** — detects `<font>`, `<center>`, `<marquee>`, `<blink>`, `<frameset>`, `<frame>`, `<noframes>`, `<applet>`, `<dir>`, `<basefont>`.

### UX Design Checks (Section 2)

| Check                        | File                        | Guideline (WSG July-2026)                                     | Impact |
| ---------------------------- | --------------------------- | ------------------------------------------------------------- | ------ |
| `checkNonEssentialContent`   | `non-essential-content.ts`  | 2.5 Design to assist and not to distract                      | medium |
| `checkNavigationStructure`   | `navigation-structure.ts`   | 2.4 Design efficient and streamlined user journeys            | medium |
| `checkDeceptivePatterns`     | `deceptive-patterns.ts`     | 2.6 Avoid being manipulative or deceptive                     | medium |
| `checkOptimizedMedia`        | `optimized-media.ts`        | 2.9 Optimize media to reduce resource use                     | high   |
| `checkLazyLoading`           | `lazy-loading.ts`           | 2.9 Optimize media to reduce resource use                     | medium |
| `checkAnimationControl`      | `animation-control.ts`      | 2.10 Ensure animation is proportionate and easy to control    | medium |
| `checkWebTypography`         | `web-typography.ts`         | 2.11 Use optimized web typography                             | medium |
| `checkAltText`               | `alt-text.ts`               | Related: Image alternative text (not scored)                  | high   |
| `checkFontStackFallbacks`    | `font-stack-fallbacks.ts`   | 2.11 Use optimized web typography                             | low    |
| `checkMinimalForms`          | `minimal-forms.ts`          | Related: Native form features (not scored)                    | low    |
| `checkDownloadableDocuments` | `downloadable-documents.ts` | 2.13 Reduce the impact of downloadable and physical documents | low    |

#### `checkNonEssentialContent` — WSG 2.5

Detects two non-essential content patterns that waste bandwidth and consume user attention:

1. **Auto-playing media** — `<video autoplay>` or `<audio autoplay>` elements start consuming bandwidth and CPU without user consent.
2. **Modals and popups** — intrusive overlay patterns (detected via common class names: `modal`, `popup`, `lightbox`, `dialog`, etc.) disrupt the user journey.

Auto-playing media is scored as `fail`; modals/popups alone as `warn`. JavaScript-injected overlays are not detectable from static HTML.

#### `checkNavigationStructure` — WSG 2.4

Validates that the page has clear navigation structure to help visitors find content quickly:

1. **Navigation landmark** — a `<nav>` element (or `role="navigation"`) must be present.
2. **Breadcrumbs** — detected via `aria-label="breadcrumb"` on any element or a `BreadcrumbList` JSON-LD block in structured data.

Missing nav landmark → `fail`; nav present but no breadcrumbs → `warn`.

#### `checkDeceptivePatterns` — WSG 2.6

Uses heuristic pattern matching to detect common dark-pattern indicators:

1. **Hidden close buttons** — modal or dialog close controls with `display:none` or `visibility:hidden` inline styles.
2. **Countdown timers** — elements with class names like `countdown`, `count-down`, or `timer`.

Both conditions return `warn` (50) with a note that manual review is recommended.

#### `checkOptimizedMedia` — WSG 2.9

Checks that images use modern, efficient formats and include explicit dimensions:

1. **Modern image formats** — at least one image should use WebP or AVIF; none using modern formats → `fail`.
2. **Explicit `width` / `height` attributes** — prevents Cumulative Layout Shift (CLS) during image load.

| Condition                                    | Status           | Score |
| -------------------------------------------- | ---------------- | ----- |
| No images                                    | `not-applicable` | —     |
| No images use WebP/AVIF                      | `fail`           | 0     |
| Modern formats used, some lack dimensions    | `warn`           | 50    |
| All images in modern formats with dimensions | `pass`           | 100   |

#### `checkLazyLoading` — WSG 2.9

Verifies that below-the-fold images use `loading="lazy"` to defer downloading. Allows the first image (likely the LCP/hero image) to remain eagerly loaded.

| Condition                                         | Status           | Score |
| ------------------------------------------------- | ---------------- | ----- |
| No images                                         | `not-applicable` | —     |
| 1 image (likely LCP — eager loading appropriate)  | `pass`           | 100   |
| 2+ images, none lazy-loaded                       | `fail`           | 0     |
| 2+ images, some lazy but not all non-first images | `warn`           | 50    |
| All non-first images use `loading="lazy"`         | `pass`           | 100   |

#### `checkAnimationControl` — WSG 2.10

Scans inline `<style>` blocks for CSS animation declarations (`@keyframes`, `animation:`, `transition:`) and checks whether a `prefers-reduced-motion` media query is also present to guard them.

| Condition                                          | Status           | Score |
| -------------------------------------------------- | ---------------- | ----- |
| No CSS animations in inline styles                 | `not-applicable` | —     |
| Animations present, `prefers-reduced-motion` guard | `pass`           | 100   |
| Animations present, no motion guard                | `fail`           | 0     |

> **Note:** External stylesheets are not analysed; a guard in a linked stylesheet will not be detected.

#### `checkWebTypography` — WSG 2.11

Checks font delivery for efficiency and readability:

1. **WOFF2 format** — at least one font file should use `.woff2` (30% smaller than WOFF).
2. **`font-display` descriptor** — prevents invisible text during font load (FOIT).
3. **Font file count** — warns if more than 4 font files are referenced (each requires a separate download).

Not using WOFF2 at all → `fail`; other issues → `warn`.

#### `checkAltText` — Related `image-alt-text` (not scored)

Verifies that all `<img>` elements have an `alt` attribute. Empty `alt=""` is accepted for decorative images (screen readers skip them). Missing `alt` → `fail`.

#### `checkFontStackFallbacks` — WSG 2.11

Scans inline `<style>` blocks for `font-family` declarations and checks that each includes a generic family keyword (`serif`, `sans-serif`, `monospace`, etc.) or a known system font as a fallback.

Any declaration without a fallback → `warn`. External stylesheets are not analysed.

#### `checkMinimalForms` — Related `native-form-features` (not scored)

Audits form design for sustainability and accessibility:

1. **Field count** — warns if > 7 fields; fails if > 12 fields.
2. **`autocomplete`** — at least one input must have an `autocomplete` attribute.
3. **`inputmode`** — at least one input should use `inputmode` for mobile-optimised keyboards.

| Condition                              | Status           | Score |
| -------------------------------------- | ---------------- | ----- |
| No form inputs                         | `not-applicable` | —     |
| > 12 fields or no `autocomplete`       | `fail`           | 0     |
| Some issues (field count, `inputmode`) | `warn`           | 50    |
| All signals present                    | `pass`           | 100   |

#### `checkDownloadableDocuments` — WSG 2.13

Detects `<a href>` links pointing to downloadable document formats: `.pdf`, `.docx`, `.doc`, `.pptx`, `.ppt`, `.xlsx`, `.xls`, `.zip`, `.rar`, `.tar`, `.gz`. Each document link found → `warn`, with recommendations to provide HTML alternatives and disclose file format and size in link text.

### Hosting & Infrastructure Checks (Section 4)

| Check                     | File                     | Guideline (WSG July-2026)                                 | Impact |
| ------------------------- | ------------------------ | --------------------------------------------------------- | ------ |
| `checkSustainableHosting` | `sustainable-hosting.ts` | 4.1 Use sustainable hosting                               | high   |
| `checkCaching`            | `caching.ts`             | 4.2 Optimize caching and support offline access           | high   |
| `checkOfflineAccess`      | `offline-access.ts`      | 4.2 Optimize caching and support offline access           | medium |
| `checkCompression`        | `compression.ts`         | 4.3 Reduce data transfer with compression                 | high   |
| `checkErrorPages`         | `error-pages.ts`         | 4.4 Setup necessary error pages and redirection links     | medium |
| `checkRedirects`          | `redirects.ts`           | 4.4 Setup necessary error pages and redirection links     | medium |
| `checkCdnUsage`           | `cdn-usage.ts`           | 4.10 Use Content Delivery Networks (CDNs) when beneficial | medium |
| `checkDataRefresh`        | `data-refresh.ts`        | 4.7 Define the frequency of data refreshes                | medium |

#### `checkSustainableHosting` — WSG 4.1

Queries the [Green Web Foundation](https://www.thegreenwebfoundation.org/) dataset via the callable CO2.js ESM export `hosting(domain)` to determine whether the target domain is served from verified renewable-energy infrastructure.

| Condition                              | Status | Score |
| -------------------------------------- | ------ | ----- |
| Domain in Green Web Foundation dataset | `pass` | 100   |
| Domain NOT in dataset                  | `fail` | 0     |

#### `checkCaching` — WSG 4.2

Verifies the page response includes effective HTTP caching directives:

| Condition                                                            | Status | Score |
| -------------------------------------------------------------------- | ------ | ----- |
| `Cache-Control` with `max-age` / `s-maxage`                          | `pass` | 100   |
| `Cache-Control` present but no `max-age`, or only `ETag` / `Expires` | `warn` | 50    |
| No caching headers at all                                            | `fail` | 0     |

#### `checkOfflineAccess` — WSG 4.2

Checks for offline/PWA support via two standard mechanisms:

1. **Web App Manifest** — `<link rel="manifest">` in the document `<head>`.
2. **Service Worker** — `navigator.serviceWorker.register(...)` call in the page source.

Both present → `pass`; one present → `warn`; neither → `fail`.

#### `checkCompression` — WSG 4.3

Inspects the `Content-Encoding` response header for gzip, Brotli (`br`), zstd, or deflate encoding. Missing or unrecognised encoding → `fail`. Brotli is highlighted in the pass message as the most efficient option.

#### `checkErrorPages` — WSG 4.4 (static analysis)

Checks the HTTP status of the fetched URL. A non-200 response → `fail`. A 200 response → `info` (manual verification recommended: request a non-existent path to confirm a custom 404 page is served).

#### `checkRedirects` — WSG 4.4 (redirects)

Analyses the redirect chain recorded during the page fetch:

| Condition                                           | Status | Score |
| --------------------------------------------------- | ------ | ----- |
| 0 redirects                                         | `pass` | 100   |
| 1–2 redirects, all 301/308 (permanent)              | `pass` | 100   |
| 1–2 redirects with at least one 302/307 (temporary) | `warn` | 50    |
| 3+ redirects (chain)                                | `fail` | 0     |

#### `checkCdnUsage` — WSG 4.10

Detects CDN delivery by inspecting well-known CDN response headers: `cf-ray` (Cloudflare), `x-amz-cf-id` (CloudFront), `x-fastly-request-id` (Fastly), `x-cache`, `x-served-by`, `via`, `age`, and others. CDN detected → `pass`; no CDN headers found → `warn` (self-hosted edge deployments may not set these headers).

#### `checkDataRefresh` — WSG 4.7

Inspects `Cache-Control` to assess the cache TTL's sustainability:

| Condition                                | Status | Score |
| ---------------------------------------- | ------ | ----- |
| `no-store` directive present             | `fail` | 0     |
| max-age / s-maxage < 60 s                | `fail` | 0     |
| max-age / s-maxage 60–299 s              | `warn` | 50    |
| max-age / s-maxage ≥ 300 s               | `pass` | 100   |
| No Cache-Control or no max-age directive | `warn` | 50    |

### Using the Checks Module

```typescript
import { WsgChecker } from '@/core'
import {
  performanceChecks,
  semanticChecks,
  sustainabilityChecks,
  securityChecks,
  uxDesignChecks,
  hostingChecks,
} from '@/checks'

// Register all check groups at once
const checker = new WsgChecker({ timeout: 15_000 }, [
  ...performanceChecks,
  ...semanticChecks,
  ...sustainabilityChecks,
  ...securityChecks,
  ...uxDesignChecks,
  ...hostingChecks,
])
const result = await checker.check('https://example.com')

// Or register individual checks for more granular control
const checker2 = new WsgChecker()
checker2.runner.register(semanticChecks[0])
checker2.runner.register(securityChecks[0])
checker2.runner.register(hostingChecks[0])
```

## Report Module (`src/report/`)

The Report Module converts a `RunResult` into a `SustainabilityReport` and formats it as JSON, Markdown, HTML, or terminal output.

### Report Data Model

#### Types

| Type / Interface       | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `Grade`                | Letter grade (`'A'`, `'B'`, `'C'`, `'D'`, `'F'`) derived from the overall score  |
| `Recommendation`       | Single actionable improvement from a `fail`/`warn` check result                  |
| `ReportMetadata`       | Page metrics: weight, resource count, CO₂, green hosting                         |
| `ReportMethodology`    | Notes on analysis type, limitations, and complementary tools                     |
| `ReportSummary`        | Aggregate pass/fail/warn/not-applicable counts                                   |
| `SustainabilityReport` | Full enriched report: grade + summary + recommendations + metadata + methodology |

#### `scoreToGrade(score)` — Grade Calculator

Maps an overall score (0–100) to a letter grade:

| Score  | Grade |
| ------ | ----- |
| 90–100 | A     |
| 75–89  | B     |
| 60–74  | C     |
| 45–59  | D     |
| 0–44   | F     |

#### `fromRunResult(runResult, pageWeight?, requestCount?, thirdPartyCount?)` — Report Factory

Converts a `RunResult` (the raw output of `WsgChecker.check()`) into a `SustainabilityReport`:

1. Derives the letter **grade** from `overallScore`.
2. Computes **summary** counts for WSG checks only; `relatedChecks` separately counts unscored related checks.
3. Builds the **recommendations** list from all `fail` and `warn` results that carry a `recommendation` string, sorted with WSG checks before related checks, then by impact (`high` first) and status (`fail` before `warn`).
4. Populates **metadata** with page-weight metrics and CO₂/green-hosting data.
5. Adds `specVersion` from `WSG_SPEC.release` to the report (it is not a field on `RunResult`).
6. Attaches standard static-analysis **methodology** notes, including a PageSpeed Insights link for live Core Web Vitals data.

#### `STATIC_ANALYSIS_DISCLAIMER`

Exported string constant included in every report's `methodology.disclaimer` field. Explains the inherent constraints of HTML/HTTP-only static analysis and points readers to complementary tools: Google PageSpeed Insights, GreenFrame, and Sitespeed.io.

#### Usage in JavaScript/TypeScript

```typescript
import { fromRunResult, scoreToGrade, STATIC_ANALYSIS_DISCLAIMER } from '@/report'
import type { SustainabilityReport } from '@/report'

// Convert a WsgChecker run result into a SustainabilityReport
const report: SustainabilityReport = fromRunResult(
  runResult,
  pageData.pageWeight.htmlSize, // page weight in bytes
  pageData.pageWeight.resourceCount, // total resource count
  pageData.pageWeight.thirdPartyCount // third-party resource count
)

console.log(`Grade: ${report.grade}`) // e.g. "B"
console.log(`Score: ${report.overallScore}`) // e.g. 82
console.log(`Passed: ${report.summary.passed}`)
console.log(`Top recommendation: ${report.recommendations[0]?.recommendation}`)
console.log(`CO₂ per view: ${report.metadata.co2PerPageView}g`)
```

### Report Formatters

Four formatters convert a `SustainabilityReport` into different output formats, all exported from `@/report`.

| Formatter | Function         | Output                                                 |
| --------- | ---------------- | ------------------------------------------------------ |
| JSON      | `formatJson`     | Machine-readable JSON string (CI, APIs, data storage)  |
| Markdown  | `formatMarkdown` | GitHub-flavoured Markdown (PR comments, documentation) |
| HTML      | `formatHtml`     | Self-contained HTML5 document (browser, email, static) |
| Terminal  | `formatTerminal` | ANSI-colourised terminal output (CLI, local dev)       |

#### `formatJson(report, indent?)`

Serialises the report to a JSON string. Pass `indent = 0` for compact/minified output.

#### `formatMarkdown(report)`

Renders a full Markdown document with sections for summary, category scores, recommendations, check results, page metrics, and methodology.

#### `formatHtml(report)`

Renders a self-contained HTML5 document with inline CSS. Supports light/dark mode via `prefers-color-scheme` and is print-friendly. All user-supplied strings are HTML-escaped to prevent XSS.

#### `formatTerminal(report, options?)`

Renders a colourised terminal report using ANSI escape codes. Pass `{ colors: false }` to disable colour (e.g., when piping to a file or when `NO_COLOR` is set).

#### Usage

```typescript
import { fromRunResult, formatJson, formatMarkdown, formatHtml, formatTerminal } from '@/report'

const report = fromRunResult(runResult, htmlSize, resourceCount, thirdPartyCount)

// JSON (for CI or API responses)
const json = formatJson(report)

// Markdown (for GitHub PR comments)
const md = formatMarkdown(report)

// HTML (for browser or static site)
const html = formatHtml(report)

// Terminal (for CLI output)
process.stdout.write(formatTerminal(report))

// Terminal without colour (plain-text file or pipe)
process.stdout.write(formatTerminal(report, { colors: false }))
```
