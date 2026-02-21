# WSG-Check Implementation Plan

## Overview

WSG-Check is a web sustainability checker that analyzes websites against the [W3C Web Sustainability Guidelines (WSG)](https://www.w3.org/TR/web-sustainability-guidelines/). It provides automated checking, reporting, and actionable recommendations.

The application is a **mobile-first Next.js web app** using the **Park UI** design system, with a CLI and API for programmatic access. It prioritizes usability, performance, accessibility, maintainability, security, and sustainability.

---

## Phase 0: Project Scaffolding & Tooling

**Goal:** Establish the development foundation with all tooling configured.

### 0.1 Initialize Next.js + TypeScript Project

- [x] Initialize Next.js (App Router) with TypeScript
- [x] Configure `tsconfig.json` with strict mode
- [x] Set `"type": "module"` in `package.json`
- [x] Configure path aliases (`@/core`, `@/checks`, `@/report`, `@/utils`, `@/config`)

### 0.2 Linting, Formatting & Code Quality

- [x] Install and configure ESLint (flat config) with TypeScript support
- [x] Install and configure Prettier + `eslint-config-prettier`
- [x] Add npm scripts: `lint`, `lint:fix`, `format`, `format:check`
- [x] Configure Husky pre-commit hook (ESLint + Prettier via lint-staged)
- [x] Configure Husky pre-push hook (run tests)

### 0.3 Testing Framework

- [x] Install and configure Vitest with TypeScript support
- [x] Add npm scripts: `test`, `test:run`, `test:coverage`
- [x] Set up coverage thresholds (target: 80%+)
- [x] Configure Codecov integration (`codecov.yml`, CI uploads coverage)

### 0.4 Styling & Design System

- [x] Install and configure PandaCSS (utility-first CSS)
- [x] Install and configure Park UI component library (built on Ark UI + PandaCSS)
- [x] Set up design tokens for the sustainability theme
- [x] Add `npm run prepare` script for PandaCSS codegen

### 0.5 CI/CD & DevOps

- [x] Validate existing `ci.yml` workflow (lint, type-check, test, build)
- [x] SonarQube analysis workflow will already be provided by Github website integration
- [x] Confirm Dependabot configuration (npm + GitHub Actions weekly)
- [x] Configure Netlify deployment (`netlify.toml` added)

### 0.6 Environment & Configuration Files

- [x] Create `.env.example` with documented environment variables
- [x] Install and configure `dotenv` for local development (`src/config/env.ts`)
- [x] Add `.gitignore` for Next.js, node_modules, coverage, .env, PandaCSS output
- [x] Add `robots.txt`, `sitemap.xml`, `site.webmanifest`, `favicon.ico` (WSG 3.17)
- [x] Add `humans.txt`, `security.txt` (WSG 3.17)

**Deliverable:** A running Next.js app with all tooling, linting, testing, and CI passing. ✅

---

## Phase 1: Config Module

**Goal:** Centralized configuration management for all modules.

### 1.1 Configuration Schema

- [x] Define TypeScript interfaces for all configuration options
- [x] Create `src/config/defaults.ts` with sensible defaults
- [x] Support configuration via:
  - Environment variables (`.env`)
  - Config file (`wsg-check.config.ts` or `.wsgcheckrc.json`)
  - CLI flags (override precedence)

### 1.2 Configuration Options

```typescript
interface WSGCheckConfig {
  // Target
  url: string

  // Check selection
  categories: ('ux' | 'web-dev' | 'hosting' | 'business')[]
  guidelines: string[] // e.g., ["3.1", "3.2", "3.7"]
  excludeGuidelines: string[]

  // Behavior
  timeout: number // HTTP request timeout (ms)
  maxDepth: number // Crawl depth (1 = single page)
  userAgent: string
  followRedirects: boolean

  // Output
  format: 'json' | 'html' | 'markdown' | 'terminal'
  outputPath?: string
  verbose: boolean

  // Thresholds
  failThreshold: number // Fail if score below this (0-100)
}
```

### 1.3 WSG Guidelines Registry

- [x] Create `src/config/guidelines-registry.ts` — a structured map of all WSG guidelines
- [x] Include for each guideline: ID, title, section, category, machine-testability flag, description
- [x] Tag guidelines as `automated`, `semi-automated`, or `manual-only`
- [ ] Add **WSG 4.1 "Use sustainable hosting"** to the registry as `automated` (machine-testable via Green Web Foundation dataset lookup using CO2.js)
- [ ] Add all **27 Section 5 (Business Strategy and Product Management)** guidelines to the registry as `manual-only`, and flag **5.5** ("Calculate the environmental impact") and **5.25** ("Define performance and environmental budgets") as `semi-automated` candidates for a future phase

**Deliverable:** Config module that loads, validates, and merges configuration from all sources. ✅

---

## Phase 2: Utils Module

**Goal:** Shared utility functions used across all modules.

### 2.1 HTTP Client

- [x] Create `src/utils/http-client.ts` using Axios
- [x] Implement request caching (avoid duplicate fetches for the same URL)
- [x] Support timeout, retry logic, and user-agent configuration
- [x] Respect `robots.txt` (WSG 4.6)
- [x] Handle redirects and record redirect chains (WSG 4.4)

### 2.2 HTML Parser

- [x] Create `src/utils/html-parser.ts` using Cheerio
- [x] Parse HTML into a queryable DOM structure
- [x] Extract metadata: `<head>` elements, meta tags, structured data
- [x] Extract resource references: stylesheets, scripts, images, fonts, media
- [x] Extract semantic structure: headings hierarchy, landmarks, ARIA attributes

### 2.3 Resource Analyzer

- [x] Create `src/utils/resource-analyzer.ts`
- [x] Calculate total page weight (HTML + CSS + JS + images + fonts + media)
- [x] Identify resource types and sizes
- [x] Detect third-party vs. first-party resources
- [x] Analyze compression (gzip/brotli) usage from response headers

### 2.4 Error Handling

- [x] Create `src/utils/errors.ts` with custom error classes
- [x] `FetchError` — network/HTTP errors
- [x] `ParseError` — HTML parsing failures
- [x] `ConfigError` — invalid configuration
- [x] `CheckError` — individual check failures
- [x] Implement graceful degradation (one check failing shouldn't abort all)

### 2.5 Logging

- [x] Create `src/utils/logger.ts`
- [x] Support log levels: `debug`, `info`, `warn`, `error`
- [x] Structured logging for API mode, formatted for CLI mode

**Deliverable:** All shared utilities with unit tests (>80% coverage). ✅

---

## Phase 3: Core Module

**Goal:** The orchestration engine that fetches content, runs checks, and produces results.

### 3.1 Page Fetcher

- [x] Create `src/core/fetcher.ts`
- [x] Fetch the target URL's HTML content
- [x] Collect all HTTP response headers (for caching, compression, security checks)
- [x] Follow and record redirect chains
- [x] Fetch linked resources (CSS, JS) for analysis
- [x] Respect `maxDepth` configuration for multi-page crawling

### 3.2 Check Runner

- [x] Create `src/core/runner.ts`
- [x] Accept a list of checks (from the Checks Module) and page data
- [x] Execute checks in parallel where possible
- [x] Collect results in a standardized format:

```typescript
interface CheckResult {
  guidelineId: string // e.g., "3.2"
  guidelineName: string
  successCriterion: string
  status: 'pass' | 'fail' | 'warn' | 'info' | 'not-applicable'
  score: number // 0-100
  message: string
  details?: string
  recommendation?: string
  resources?: string[] // Links to WSG resources
  impact: 'high' | 'medium' | 'low'
  category: 'ux' | 'web-dev' | 'hosting' | 'business'
  machineTestable: boolean
}
```

### 3.3 Score Calculator

- [x] Create `src/core/scorer.ts`
- [x] Calculate per-guideline scores
- [x] Calculate per-category scores (UX, Web Dev, Hosting, Business)
- [x] Calculate overall sustainability score (0–100)
- [x] Weight scores by impact level

### 3.4 Main Orchestrator

- [x] Create `src/core/index.ts` — the main entry point
- [x] Pipeline: Config → Fetch → Parse → Run Checks → Score → Report
- [x] Support single-page and multi-page analysis modes

### 3.5 Carbon Estimation (CO2.js Integration)

- [x] Add `@tgwf/co2` as a dependency (Apache 2.0, ESM-native, ~15 KB)
- [x] After `analyzePageWeight()` returns total transfer bytes, pass the byte count to `co2.perByte()` using the Sustainable Web Design v4 model to compute `co2PerPageView` in grams
- [x] Expose `co2PerPageView`, `co2Model: 'swd-v4'`, and `isGreenHosted` as top-level fields in `SustainabilityReport` metadata

**Deliverable:** Core module that can fetch a URL, run registered checks, and return scored results. ✅

---

## Phase 4: Checks Module — Web Development Guidelines (Priority 1)

**Goal:** Implement machine-testable checks for WSG Section 3 (Web Development). These are the highest-priority automated checks.

### 4.1 Performance & Efficiency Checks

- [x] **WSG 3.3 — Minify Your HTML, CSS, and JavaScript** — Detect unminified HTML (blank-line ratio, HTML comment count); implemented in `src/checks/minification.ts`
- [x] **WSG 3.8 — Resolve Render Blocking Content** — Check for `async`/`defer` on scripts and `loading="lazy"` on images; implemented in `src/checks/render-blocking.ts`
- [x] **3.1 Performance goals** — Check total page weight against budgets (HTML > 100 KB → warn, > 500 KB → fail; resources > 50 → warn, > 100 → fail); implemented in `src/checks/page-weight.ts`
- [ ] **3.3 Code splitting** — Check for large monolithic JS bundles (>250KB; requires fetching individual JS files — deferred to a future phase)
- [ ] **3.4 Remove unnecessary code** — Detect unused CSS (compare selectors to DOM; requires headless browser execution — deferred to a future phase)

### 4.2 Semantic & Standards Checks

- [x] **3.7 Semantic code** — Validate semantic HTML usage (headings hierarchy, landmarks, lang attribute); implemented in `src/checks/semantic-html.ts`
- [x] **3.7 Built-in over custom** — Detect custom implementations of native HTML elements (`<div role="button">` etc.); implemented in `src/checks/semantic-html.ts`
- [x] **3.9 Accessibility aids** — Check for skip navigation links and `<main>` landmark; implemented in `src/checks/accessibility-aids.ts`
- [x] **3.10 Form validation** — Check form inputs for associated labels and autocomplete attributes; implemented in `src/checks/form-validation.ts`
- [x] **3.4 Metadata** — Validate `<title>`, meta description, and Open Graph tags; implemented in `src/checks/metadata.ts`
- [x] **3.11 Structured data** — Check for Schema.org JSON-LD blocks; implemented in `src/checks/metadata.ts`

### 4.3 Sustainability-Specific Checks

- [x] **3.5 Avoid redundancy** — Detect duplicate CSS rules, repeated inline styles; implemented in `src/checks/redundancy.ts`
- [x] **3.6 Third-party assessment** — Count and assess third-party scripts/resources; implemented in `src/checks/third-party.ts`
- [x] **3.12 Preference media queries** — Check for `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-reduced-data`; include in recommendation text that dark mode reduces energy consumption on OLED screens by up to 47% ([Google research](https://support.google.com/pixelphone/answer/7158589)), in addition to accessibility benefits; implemented in `src/checks/preference-media-queries.ts`
- [x] **3.13 Responsive design** — Check viewport meta, responsive images (`srcset`), media queries; implemented in `src/checks/responsive-design.ts`
- [x] **3.14 Sustainable JavaScript** — Detect unnecessary JS, check for API efficiency; implemented in `src/checks/sustainable-js.ts`

### 4.4 Security & Maintenance Checks

- [x] **3.15 Code security** — Check security headers (CSP, HSTS, X-Frame-Options, etc.); implemented in `src/checks/security-headers.ts`
- [x] **3.16 Dependencies** — Analyze third-party dependency count and size; implemented in `src/checks/dependency-count.ts`
- [x] **3.17 Expected files** — Check for `favicon.ico`, `robots.txt`, `sitemap.xml`, `site.webmanifest`; implemented in `src/checks/expected-files.ts`
- [x] **3.17 Beneficial files** — Check for `security.txt`, `humans.txt`, `carbon.txt`; implemented in `src/checks/expected-files.ts`
- [x] **3.19 Latest language version** — Check for outdated HTML doctype, deprecated elements; implemented in `src/checks/html-version.ts`

**Deliverable:** ~20 automated checks covering WSG Section 3, each with unit tests.

---

## Phase 5: Checks Module — UX Design & Hosting Guidelines (Priority 2)

**Goal:** Implement checks for WSG Sections 2 and 4 that can be machine-tested.

### 5.1 UX Design Checks (Section 2 — machine-testable subset)

- [x] **2.9 Non-essential content** — Detect auto-playing media, excessive modals/popups; implemented in `src/checks/non-essential-content.ts`
- [x] **2.8 Navigation structure** — Validate navigation landmarks, breadcrumbs, consistent nav; implemented in `src/checks/navigation-structure.ts`
- [x] **2.10 Deceptive patterns** — Detect known dark pattern indicators (e.g., hidden close buttons, countdown timers); implemented in `src/checks/deceptive-patterns.ts`
- [x] **2.7 Optimized media** — Check image formats (WebP/AVIF preferred), explicit dimensions to prevent layout shifts; implemented in `src/checks/optimized-media.ts`
- [x] **2.11 Lazy loading** — Verify below-the-fold images use `loading="lazy"` (heuristic: allows first/LCP image to be eager); implemented in `src/checks/lazy-loading.ts`
- [x] **2.15 Animation control** — Detect CSS animations in inline styles without `prefers-reduced-motion` guard; implemented in `src/checks/animation-control.ts`
- [x] **2.16 Web typography** — Check font file count, WOFF2 format preference, `font-display` descriptor; implemented in `src/checks/web-typography.ts`
- [x] **2.17 Alternative text** — Verify all `<img>` have an `alt` attribute (empty `alt=""` accepted for decorative images); implemented in `src/checks/alt-text.ts`
- [x] **2.16 Font stack fallbacks** — Check for system font fallbacks and generic family in `font-family` CSS declarations; implemented in `src/checks/font-stack-fallbacks.ts`
- [x] **2.19 Minimal forms** — Audit form field count (warn >7, fail >12), `autocomplete`, and `inputmode` for mobile-friendly input; implemented in `src/checks/minimal-forms.ts`
- [x] **2.17 Downloadable documents** — Detect `<a href>` links to PDFs and other large document formats (`.pdf`, `.docx`, `.pptx`, `.zip`, etc.); recommend compression and HTML alternatives for long-term content; implemented in `src/checks/downloadable-documents.ts`

### 5.2 Hosting & Infrastructure Checks (Section 4 — machine-testable subset)

- [x] **4.1 Sustainable hosting** — Use `hosting.check(domain)` from CO2.js to query the Green Web Foundation dataset and determine whether the target domain is served from verified renewable-energy infrastructure; implemented in `src/checks/sustainable-hosting.ts`
- [x] **4.2 Caching** — Check cache headers (`Cache-Control` with `max-age`/`s-maxage`, `ETag`, `Expires`); implemented in `src/checks/caching.ts`
- [x] **4.2 Offline access** — Check for service worker registration (`navigator.serviceWorker.register`) and PWA manifest (`<link rel="manifest">`); implemented in `src/checks/offline-access.ts`
- [x] **4.3 Compression** — Verify gzip/brotli/zstd encoding via `Content-Encoding` response header; implemented in `src/checks/compression.ts`
- [x] **4.4 Error pages** — Checks HTTP status of the fetched URL; flags non-200 responses; returns `info` for 200 responses to prompt manual 404 verification; implemented in `src/checks/error-pages.ts`
- [x] **4.4 Redirects** — Detect redirect chains (fail ≥3 hops), check for temporary 302 vs. permanent 301 redirects; implemented in `src/checks/redirects.ts`
- [x] **4.10 CDN usage** — Detect CDN-specific response headers (Cloudflare, CloudFront, Fastly, Varnish, etc.); implemented in `src/checks/cdn-usage.ts`
- [x] **4.7 Data refresh** — Check `Cache-Control` TTL appropriateness: fail for `no-store` or max-age < 60 s, warn for max-age 60–299 s, pass for ≥ 300 s; implemented in `src/checks/data-refresh.ts`

**Deliverable:** 19 automated checks covering WSG Sections 2 and 4. ✅

---

## Phase 6: Report Module

**Goal:** Generate clear, actionable sustainability reports in multiple formats.

### 6.1 Report Data Model

- [x] Create `src/report/types.ts`

```typescript
interface SustainabilityReport {
  url: string
  timestamp: string
  duration: number // Analysis time in ms
  overallScore: number // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  categories: CategoryScore[]
  checks: CheckResult[]
  summary: {
    totalChecks: number
    passed: number
    failed: number
    warnings: number
    notApplicable: number
  }
  recommendations: Recommendation[]
  metadata: {
    pageWeight: number
    requestCount: number
    thirdPartyCount: number
    loadTime?: number
    co2PerPageView?: number // grams of CO2 per page view (SWD model)
    co2Model?: 'swd-v4' // CO2 estimation model used
    isGreenHosted?: boolean // Green Web Foundation hosting check result
  }
  methodology: {
    analysisType: 'static' | 'browser' // 'static' = HTML/HTTP analysis; 'browser' = future headless mode
    disclaimer: string // notes on static-analysis limitations
    co2EstimationModel?: string
    coreWebVitalsNote?: string // link to PageSpeed Insights for real CWV data
  }
}
```

### 6.2 Report Formatters

- [x] Create `src/report/formatters/json.ts` — Raw JSON output
- [x] Create `src/report/formatters/markdown.ts` — Markdown report
- [x] Create `src/report/formatters/html.ts` — Styled HTML report
- [x] Create `src/report/formatters/terminal.ts` — Colorized terminal output with tables

### 6.3 Recommendations Engine

- [x] Create `src/report/recommendations.ts`
- [x] Map each failed/warned check to actionable improvement steps
- [x] Prioritize recommendations by impact level
- [x] Include links to relevant WSG resources and success criteria
- [x] For WSG 3.1 (performance goals) and 3.8 (deferred resources): include a note that static analysis cannot measure Core Web Vitals and link to Google PageSpeed Insights (`https://pagespeed.web.dev/report?url=<encoded-url>`) for live CWV data
- [x] Reference complementary tools in the report for dimensions WSG-Check does not cover: **GreenFrame** (scenario-based energy monitoring), **Sitespeed.io** (performance + sustainability with real browser), **Google PageSpeed Insights / Lighthouse** (Core Web Vitals), **WebPageTest** (detailed waterfall + carbon estimates)

### 6.4 Score Visualization

- [ ] Overall score badge (A–F grading with color)
- [ ] Per-category radar/bar chart data
- [ ] Trend comparison (if previous reports are available)

**Deliverable:** Report module that outputs structured reports in 4 formats.

---

## Phase 7: CLI Module

**Goal:** A command-line tool for running WSG checks from the terminal.

### 7.1 CLI Framework

- [ ] Create `src/cli/index.ts` as the entry point
- [ ] Use a lightweight CLI framework (e.g., `commander` or `yargs`)
- [ ] Register `wsg-check` as a bin command in `package.json`
- [ ] Support `npx wsg-check <url>` usage

### 7.2 CLI Commands

```bash
# Basic usage
wsg-check https://example.com

# With options
wsg-check https://example.com --format json --output report.json
wsg-check https://example.com --categories web-dev,hosting
wsg-check https://example.com --guidelines 3.1,3.2,3.7
wsg-check https://example.com --verbose
wsg-check https://example.com --fail-threshold 70

# Config file
wsg-check --config wsg-check.config.ts

# Help
wsg-check --help
wsg-check --version
```

### 7.3 Terminal Output

- [ ] Colorized pass/fail/warn indicators
- [ ] Progress spinner during analysis
- [ ] Summary table with scores
- [ ] Exit code: `0` if above threshold, `1` if below (for CI integration)

**Deliverable:** Fully functional CLI tool that can be used standalone or in CI pipelines.

---

## Phase 8: API Module

**Goal:** RESTful API for programmatic access to WSG-Check functionality.

### 8.1 API Routes (Next.js Route Handlers)

- [ ] `POST /api/check` — Submit a URL for analysis
- [ ] `GET /api/check/:id` — Get results for a completed check
- [ ] `GET /api/guidelines` — List all supported WSG guidelines
- [ ] `GET /api/guidelines/:id` — Get details for a specific guideline
- [ ] `GET /api/health` — Health check endpoint

### 8.2 API Design

```typescript
// POST /api/check
// Request
{
  url: string;
  categories?: string[];
  guidelines?: string[];
  format?: 'json' | 'html' | 'markdown';
}

// Response
{
  id: string;
  status: 'completed';
  report: SustainabilityReport;
}
```

### 8.3 API Features

- [ ] Input validation and sanitization (prevent SSRF, validate URLs)
- [ ] Rate limiting to prevent abuse
- [ ] CORS configuration
- [ ] Error responses with standard HTTP status codes
- [ ] OpenAPI/Swagger documentation

**Deliverable:** REST API with documented endpoints, input validation, and rate limiting.

---

## Phase 9: Frontend Module

**Goal:** A mobile-first web UI for checking website sustainability.

### 9.1 Layout & Navigation (Mobile-First)

- [ ] Create responsive shell layout with Park UI components
- [ ] Bottom navigation bar for core actions (thumb-friendly, WSG 2.5)
- [ ] Minimal, distraction-free header (WSG 2.6)
- [ ] Skip links and ARIA landmarks (WSG 3.9)
- [ ] Support `prefers-color-scheme` (dark mode) (WSG 3.12)
- [ ] Support `prefers-reduced-motion` (WSG 2.12, 3.12)

### 9.2 Pages

#### Home / Check Page (`/`)

- [ ] URL input form with validation (WSG 2.15)
- [ ] Quick-start guide / instructions
- [ ] Recent checks history (stored in `localStorage`)
- [ ] 48px+ touch targets, one-handed reachability

#### Results Page (`/results/:id`)

- [ ] Overall sustainability score with grade badge
- [ ] Category breakdown (radar chart or bar chart)
- [ ] Expandable/collapsible check results grouped by category
- [ ] Pass/fail/warn visual indicators
- [ ] Recommendations section prioritized by impact
- [ ] Export options: JSON, Markdown, PDF
- [ ] Share/link to results

#### Guidelines Reference (`/guidelines`)

- [ ] Browsable list of all WSG guidelines
- [ ] Filter by category, machine-testability, impact
- [ ] Each guideline shows: description, success criteria, check status
- [ ] Link to official W3C WSG source

#### About Page (`/about`)

- [ ] Project purpose and methodology
- [ ] How scoring works
- [ ] Sustainability statement
- [ ] Links to WSG specification

### 9.3 Accessibility & Performance

- [ ] Ensure WCAG 2.2 AA compliance
- [ ] Lighthouse scores: Performance ≥90, Accessibility ≥95, Best Practices ≥90
- [ ] Server-side rendering for initial load performance
- [ ] Progressive enhancement — functional without JavaScript when possible
- [ ] Optimized images (WebP/AVIF, responsive `srcset`)
- [ ] Font optimization: WOFF2, `font-display: swap`, system font fallbacks

### 9.4 Sustainability of the Tool Itself

- [ ] Minimize page weight (<500KB initial load budget)
- [ ] Minimal third-party dependencies on the frontend
- [ ] Efficient data fetching (no unnecessary API calls)
- [ ] Service worker for offline access to previous results (WSG 4.2)

**Deliverable:** A fully functional, accessible, mobile-first web application.

---

## Phase 10: Integration Testing & Quality Assurance

### 10.1 Testing Strategy

- [ ] Unit tests for each check function (≥80% coverage)
- [ ] Integration tests for the full pipeline (URL → Check → Report)
- [ ] E2E tests for frontend (Playwright or Cypress)
- [ ] API endpoint tests
- [ ] CLI integration tests
- [ ] Accessibility tests with pa11y
- [ ] Performance tests with Lighthouse CI

### 10.2 Quality Gates

- [ ] All CI jobs pass (lint, type-check, test, build)
- [ ] Coverage ≥80% overall
- [ ] No critical SonarQube issues
- [ ] No Snyk security vulnerabilities in dependencies
- [ ] Lighthouse scores meet thresholds
- [ ] pa11y returns zero accessibility errors

### 10.3 Documentation

- [ ] Update README with usage instructions, examples, architecture
- [ ] API documentation (OpenAPI/Swagger)
- [ ] CLI `--help` output is comprehensive
- [ ] CONTRIBUTING.md with development setup guide
- [ ] CHANGELOG.md (keep-a-changelog format)
- [ ] Inline code comments for complex logic (WSG 2.8)

**Deliverable:** Comprehensive test suite and documentation.

---

## Phase 11: Deployment & Launch

### 11.1 Netlify Deployment

- [ ] Configure `netlify.toml` with build settings
- [ ] Set up preview deploys for PRs
- [ ] Configure production deployment on `main` branch
- [ ] Set up environment variables in Netlify dashboard
- [ ] Configure custom domain (if applicable)

### 11.2 Launch Checklist

- [ ] All functional tests passing
- [ ] Security scan (Snyk, CodeQL) clean
- [ ] Performance budgets met
- [ ] SEO meta tags and Open Graph configured
- [ ] Analytics configured (privacy-respecting, WSG 2.7)
- [ ] Error tracking configured (Sentry or similar)
- [ ] `carbon.txt` and sustainability statement published

---

## Implementation Priority & Timeline

| Phase | Name                  | Priority | Est. Effort | Dependencies |
| ----- | --------------------- | -------- | ----------- | ------------ |
| 0     | Project Scaffolding   | Critical | 1–2 days    | None         |
| 1     | Config Module         | Critical | 1 day       | Phase 0      |
| 2     | Utils Module          | Critical | 2–3 days    | Phase 0      |
| 3     | Core Module           | Critical | 2–3 days    | Phases 1, 2  |
| 4     | Checks — Web Dev      | High     | 4–5 days    | Phase 3      |
| 5     | Checks — UX & Hosting | High     | 3–4 days    | Phase 3      |
| 6     | Report Module         | High     | 2–3 days    | Phase 3      |
| 7     | CLI Module            | Medium   | 1–2 days    | Phases 3, 6  |
| 8     | API Module            | Medium   | 2–3 days    | Phases 3, 6  |
| 9     | Frontend Module       | Medium   | 5–7 days    | Phases 6, 8  |
| 10    | Testing & QA          | High     | 3–4 days    | All          |
| 11    | Deployment            | Medium   | 1 day       | Phase 10     |

**Estimated total: 4–6 weeks** (single developer, full-time)

---

## WSG Guidelines Coverage Matrix

### Machine-Testable (Automated Checks — Phases 4 & 5)

| Guideline                                        | ID   | Automated | Phase |
| ------------------------------------------------ | ---- | --------- | ----- |
| Set goals based on performance and energy impact | 3.1  | Yes       | 4     |
| Remove unnecessary or redundant information      | 3.2  | Yes       | 4     |
| Modularize bandwidth-heavy components            | 3.3  | Yes       | 4     |
| Remove unnecessary code                          | 3.4  | Yes       | 4     |
| Avoid redundancy and duplication in code         | 3.5  | Yes       | 4     |
| Third-party assessment                           | 3.6  | Yes       | 4     |
| Semantic code practices                          | 3.7  | Yes       | 4     |
| Defer non-critical resources                     | 3.8  | Yes       | 4     |
| Accessibility aids                               | 3.9  | Yes       | 4     |
| Form validation and tooling                      | 3.10 | Yes       | 4     |
| Structured metadata                              | 3.11 | Yes       | 4     |
| Preference media queries                         | 3.12 | Yes       | 4     |
| Responsive layouts                               | 3.13 | Yes       | 4     |
| Standards-based JavaScript                       | 3.14 | Yes       | 4     |
| Secure code                                      | 3.15 | Yes       | 4     |
| Dependency management                            | 3.16 | Yes       | 4     |
| Expected and beneficial files                    | 3.17 | Yes       | 4     |
| Latest language version                          | 3.19 | Yes       | 4     |
| Non-essential content                            | 2.4  | Partial   | 5     |
| Navigation structure                             | 2.5  | Partial   | 5     |
| Optimized media                                  | 2.11 | Yes       | 5     |
| Animation control                                | 2.12 | Partial   | 5     |
| Web typography                                   | 2.13 | Yes       | 5     |
| Alternative text                                 | 2.14 | Yes       | 5     |
| Minimal forms                                    | 2.15 | Partial   | 5     |
| Downloadable documents                           | 2.17 | Yes       | 5     |
| Caching and offline access                       | 4.2  | Yes       | 5     |
| Compression                                      | 4.3  | Yes       | 5     |
| Error pages and redirects                        | 4.4  | Yes       | 5     |
| CDN usage                                        | 4.10 | Partial   | 5     |
| Sustainable hosting                              | 4.1  | Yes       | 5     |

### Manual/Advisory (Reported as guidelines, not checked — future phases)

| Guideline                                | ID   | Notes                                                         |
| ---------------------------------------- | ---- | ------------------------------------------------------------- |
| External factors                         | 2.1  | Manual review required                                        |
| User requirements                        | 2.2  | Manual review required                                        |
| Sustainability in ideation               | 2.3  | Process-oriented                                              |
| Design to assist                         | 2.6  | Manual UX review                                              |
| Deceptive patterns                       | 2.7  | Partially automatable                                         |
| Deliverables reuse                       | 2.8  | Process-oriented                                              |
| Design systems                           | 2.9  | Manual review                                                 |
| Clear content                            | 2.10 | NLP analysis potential (future)                               |
| Database queries                         | 3.20 | Requires server access; `semi-automated` tag in registry      |
| Section 5 (Business) — all 27 guidelines | 5.x  | Organizational; registry entries marked `manual-only`         |
| ↳ Calculate the environmental impact     | 5.5  | Automation candidate (future phase) — ties to CO2 estimation  |
| ↳ Performance and environmental budgets  | 5.25 | Automation candidate (future phase) — ties to `failThreshold` |

---

## Tech Stack Summary

| Layer         | Technology           | Purpose                             |
| ------------- | -------------------- | ----------------------------------- |
| Runtime       | Node.js 22           | Server-side JavaScript              |
| Framework     | Next.js (App Router) | SSR, API routes, frontend           |
| Language      | TypeScript (strict)  | Type safety                         |
| UI Library    | React 19             | Component architecture              |
| Design System | Park UI + Ark UI     | Accessible components               |
| CSS           | PandaCSS             | Utility-first, mobile-first styling |
| HTTP Client   | Axios                | Fetching target websites            |
| HTML Parser   | Cheerio              | Server-side DOM parsing             |
| Testing       | Vitest + Playwright  | Unit, integration, E2E tests        |
| Linting       | ESLint + Prettier    | Code quality                        |
| Git Hooks     | Husky + lint-staged  | Pre-commit/push quality gates       |
| CI/CD         | GitHub Actions       | Automated testing & deployment      |
| Hosting       | Netlify              | Production deployment               |
| Security      | Snyk + CodeQL        | SAST and dependency scanning        |
| Code Quality  | SonarQube            | Code smells, tech debt tracking     |
| Accessibility | pa11y + Lighthouse   | a11y auditing                       |

---

## Directory Structure

```
wsg-check/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── sonarqube.yml
│   ├── copilot_instructions.md
│   ├── dependabot.yml
│   └── instructions/
├── public/
│   ├── favicon.ico
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── site.webmanifest
│   ├── humans.txt
│   ├── security.txt
│   └── carbon.txt
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Home / Check page
│   │   ├── results/
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Results page
│   │   ├── guidelines/
│   │   │   └── page.tsx        # Guidelines reference
│   │   ├── about/
│   │   │   └── page.tsx        # About page
│   │   └── api/
│   │       ├── check/
│   │       │   └── route.ts    # POST /api/check
│   │       ├── guidelines/
│   │       │   └── route.ts    # GET /api/guidelines
│   │       └── health/
│   │           └── route.ts    # GET /api/health
│   ├── cli/
│   │   ├── index.ts            # CLI entry point
│   │   └── commands/
│   │       └── check.ts
│   ├── core/
│   │   ├── index.ts            # Main orchestrator
│   │   ├── fetcher.ts          # Page fetcher
│   │   ├── runner.ts           # Check runner
│   │   └── scorer.ts           # Score calculator
│   ├── checks/
│   │   ├── index.ts            # Check registry
│   │   ├── web-dev/            # WSG Section 3 checks
│   │   │   ├── minified-code.ts
│   │   │   ├── code-splitting.ts
│   │   │   ├── semantic-html.ts
│   │   │   ├── security-headers.ts
│   │   │   ├── metadata.ts
│   │   │   ├── expected-files.ts
│   │   │   ├── preference-queries.ts
│   │   │   ├── responsive-design.ts
│   │   │   └── ...
│   │   ├── ux/                 # WSG Section 2 checks
│   │   │   ├── image-optimization.ts
│   │   │   ├── lazy-loading.ts
│   │   │   ├── alt-text.ts
│   │   │   ├── font-optimization.ts
│   │   │   ├── animation-control.ts
│   │   │   └── ...
│   │   └── hosting/            # WSG Section 4 checks
│   │       ├── caching.ts
│   │       ├── compression.ts
│   │       ├── error-pages.ts
│   │       └── ...
│   ├── report/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── recommendations.ts
│   │   └── formatters/
│   │       ├── json.ts
│   │       ├── markdown.ts
│   │       ├── html.ts
│   │       └── terminal.ts
│   ├── config/
│   │   ├── index.ts
│   │   ├── defaults.ts
│   │   ├── schema.ts
│   │   └── guidelines-registry.ts
│   ├── utils/
│   │   ├── http-client.ts
│   │   ├── html-parser.ts
│   │   ├── resource-analyzer.ts
│   │   ├── errors.ts
│   │   └── logger.ts
│   └── components/             # React components
│       ├── ui/                 # Park UI wrappers
│       ├── score-badge.tsx
│       ├── check-result-card.tsx
│       ├── category-chart.tsx
│       ├── url-input.tsx
│       └── ...
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── jest.config.ts (or vitest.config.ts)
├── next.config.ts
├── netlify.toml
├── package.json
├── panda.config.ts
├── tsconfig.json
├── wsg-check.config.ts
├── IMPLEMENTATION_PLAN.md
├── CONTRIBUTING.md
├── CHANGELOG.md
└── README.md
```

---

## Key Design Decisions

1. **Next.js App Router** — Provides SSR for performance, API routes for the backend, and a modern React architecture in one framework.
2. **Park UI + PandaCSS** — Zero-runtime CSS with accessible components aligns with sustainability goals (minimal JS, smaller bundles).
3. **Cheerio (not Puppeteer/Playwright for checking)** — Lightweight HTML parsing without a headless browser reduces resource consumption. A future phase could add headless browser analysis for JS-rendered content.
4. **Check-as-function pattern** — Each check is a pure function: `(pageData) => CheckResult`. This makes checks independently testable, composable, and easy to add.
5. **Vitest over Jest** — Faster, ESM-native, better TypeScript support.
6. **Separate CLI binary** — The CLI can be published and used independently of the web app.

---

## Future Enhancements (Post-Launch)

- **Browser extension** — One-click WSG check for the current page
- **Scheduled monitoring** — Cron-based recurring checks with trend tracking
- **CI integration** — GitHub Action that runs WSG-Check on PRs
- **NLP-based content checks** — Use NLP to assess content clarity (WSG 2.10)
- **Country-specific CO2 estimate (v2)** — Use CO2.js's bundled per-country grid intensity data (Ember/UNFCCC) with an optional country selector or server IP geo-detection for a more accurate carbon estimate than the global SWD average
- **Headless browser mode** — Use Playwright for JS-rendered content analysis and actual transfer-size measurement
- **Compare mode** — Compare two URLs or track improvements over time
- **Badge/widget** — Embeddable sustainability score badge for websites
- **API v2** — WebSocket support for real-time check progress
