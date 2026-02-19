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
- [ ] Configure Codecov integration

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
- [ ] Install and configure `dotenv` for local development
- [x] Add `.gitignore` for Next.js, node_modules, coverage, .env, PandaCSS output
- [x] Add `robots.txt`, `sitemap.xml`, `site.webmanifest`, `favicon.ico` (WSG 3.17)
- [x] Add `humans.txt`, `security.txt` (WSG 3.17)

**Deliverable:** A running Next.js app with all tooling, linting, testing, and CI passing. ✅

---

## Phase 1: Config Module

**Goal:** Centralized configuration management for all modules.

### 1.1 Configuration Schema

- [ ] Define TypeScript interfaces for all configuration options
- [ ] Create `src/config/defaults.ts` with sensible defaults
- [ ] Support configuration via:
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

- [ ] Create `src/config/guidelines-registry.ts` — a structured map of all WSG guidelines
- [ ] Include for each guideline: ID, title, section, category, machine-testability flag, description
- [ ] Tag guidelines as `automated`, `semi-automated`, or `manual-only`

**Deliverable:** Config module that loads, validates, and merges configuration from all sources.

---

## Phase 2: Utils Module

**Goal:** Shared utility functions used across all modules.

### 2.1 HTTP Client

- [ ] Create `src/utils/http-client.ts` using Axios
- [ ] Implement request caching (avoid duplicate fetches for the same URL)
- [ ] Support timeout, retry logic, and user-agent configuration
- [ ] Respect `robots.txt` (WSG 4.6)
- [ ] Handle redirects and record redirect chains (WSG 4.4)

### 2.2 HTML Parser

- [ ] Create `src/utils/html-parser.ts` using Cheerio
- [ ] Parse HTML into a queryable DOM structure
- [ ] Extract metadata: `<head>` elements, meta tags, structured data
- [ ] Extract resource references: stylesheets, scripts, images, fonts, media
- [ ] Extract semantic structure: headings hierarchy, landmarks, ARIA attributes

### 2.3 Resource Analyzer

- [ ] Create `src/utils/resource-analyzer.ts`
- [ ] Calculate total page weight (HTML + CSS + JS + images + fonts + media)
- [ ] Identify resource types and sizes
- [ ] Detect third-party vs. first-party resources
- [ ] Analyze compression (gzip/brotli) usage from response headers

### 2.4 Error Handling

- [ ] Create `src/utils/errors.ts` with custom error classes
- [ ] `FetchError` — network/HTTP errors
- [ ] `ParseError` — HTML parsing failures
- [ ] `ConfigError` — invalid configuration
- [ ] `CheckError` — individual check failures
- [ ] Implement graceful degradation (one check failing shouldn't abort all)

### 2.5 Logging

- [ ] Create `src/utils/logger.ts`
- [ ] Support log levels: `debug`, `info`, `warn`, `error`
- [ ] Structured logging for API mode, formatted for CLI mode

**Deliverable:** All shared utilities with unit tests (>80% coverage).

---

## Phase 3: Core Module

**Goal:** The orchestration engine that fetches content, runs checks, and produces results.

### 3.1 Page Fetcher

- [ ] Create `src/core/fetcher.ts`
- [ ] Fetch the target URL's HTML content
- [ ] Collect all HTTP response headers (for caching, compression, security checks)
- [ ] Follow and record redirect chains
- [ ] Fetch linked resources (CSS, JS) for analysis
- [ ] Respect `maxDepth` configuration for multi-page crawling

### 3.2 Check Runner

- [ ] Create `src/core/runner.ts`
- [ ] Accept a list of checks (from the Checks Module) and page data
- [ ] Execute checks in parallel where possible
- [ ] Collect results in a standardized format:

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

- [ ] Create `src/core/scorer.ts`
- [ ] Calculate per-guideline scores
- [ ] Calculate per-category scores (UX, Web Dev, Hosting, Business)
- [ ] Calculate overall sustainability score (0–100)
- [ ] Weight scores by impact level

### 3.4 Main Orchestrator

- [ ] Create `src/core/index.ts` — the main entry point
- [ ] Pipeline: Config → Fetch → Parse → Run Checks → Score → Report
- [ ] Support single-page and multi-page analysis modes

**Deliverable:** Core module that can fetch a URL, run registered checks, and return scored results.

---

## Phase 4: Checks Module — Web Development Guidelines (Priority 1)

**Goal:** Implement machine-testable checks for WSG Section 3 (Web Development). These are the highest-priority automated checks.

### 4.1 Performance & Efficiency Checks

- [ ] **3.1 Performance goals** — Check total page weight against budgets, count requests
- [ ] **3.2 Minified code** — Detect unminified CSS/JS in production
- [ ] **3.3 Code splitting** — Check for large monolithic JS bundles (>250KB)
- [ ] **3.4 Remove unnecessary code** — Detect unused CSS (compare selectors to DOM)
- [ ] **3.8 Defer non-critical resources** — Check for `async`/`defer` on scripts, lazy-loaded images

### 4.2 Semantic & Standards Checks

- [ ] **3.7 Semantic code** — Validate semantic HTML usage (headings hierarchy, landmarks, ARIA)
- [ ] **3.7 Built-in over custom** — Detect custom implementations of native HTML elements
- [ ] **3.9 Accessibility aids** — Check for skip links, ARIA landmarks
- [ ] **3.10 Form validation** — Check forms for labels, error handling, clipboard access
- [ ] **3.11 Metadata** — Validate `<title>`, meta tags, Open Graph, structured data (Schema.org)

### 4.3 Sustainability-Specific Checks

- [ ] **3.5 Avoid redundancy** — Detect duplicate CSS rules, repeated inline styles
- [ ] **3.6 Third-party assessment** — Count and assess third-party scripts/resources
- [ ] **3.12 Preference media queries** — Check for `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-reduced-data`
- [ ] **3.13 Responsive design** — Check viewport meta, responsive images (`srcset`), media queries
- [ ] **3.14 Sustainable JavaScript** — Detect unnecessary JS, check for API efficiency

### 4.4 Security & Maintenance Checks

- [ ] **3.15 Code security** — Check security headers (CSP, HSTS, X-Frame-Options, etc.)
- [ ] **3.16 Dependencies** — Analyze third-party dependency count and size
- [ ] **3.17 Expected files** — Check for `favicon.ico`, `robots.txt`, `sitemap.xml`, `site.webmanifest`
- [ ] **3.17 Beneficial files** — Check for `security.txt`, `humans.txt`, `carbon.txt`
- [ ] **3.19 Latest language version** — Check for outdated HTML doctype, deprecated elements

**Deliverable:** ~20 automated checks covering WSG Section 3, each with unit tests.

---

## Phase 5: Checks Module — UX Design & Hosting Guidelines (Priority 2)

**Goal:** Implement checks for WSG Sections 2 and 4 that can be machine-tested.

### 5.1 UX Design Checks (Section 2 — machine-testable subset)

- [ ] **2.4 Non-essential content** — Detect auto-playing media, excessive modals/popups
- [ ] **2.5 Navigation structure** — Validate navigation landmarks, breadcrumbs, consistent nav
- [ ] **2.7 Deceptive patterns** — Detect known dark pattern indicators (e.g., hidden close buttons, countdown timers)
- [ ] **2.11 Optimized media** — Check image formats (WebP/AVIF preferred), compression, responsive sizing
- [ ] **2.11 Lazy loading** — Verify below-the-fold images use `loading="lazy"`
- [ ] **2.12 Animation control** — Detect CSS animations without `prefers-reduced-motion` guard
- [ ] **2.13 Web typography** — Check font file count, size, formats (WOFF2 preferred), `font-display`
- [ ] **2.14 Alternative text** — Verify all `<img>` have meaningful `alt` attributes
- [ ] **2.14 Font stack fallbacks** — Check for system font fallbacks in CSS
- [ ] **2.15 Minimal forms** — Audit form field count, check for `autocomplete`, `inputmode`

### 5.2 Hosting & Infrastructure Checks (Section 4 — machine-testable subset)

- [ ] **4.2 Caching** — Check cache headers (`Cache-Control`, `ETag`, `Expires`)
- [ ] **4.2 Offline access** — Check for service worker registration, PWA manifest
- [ ] **4.3 Compression** — Verify gzip/brotli encoding on responses
- [ ] **4.4 Error pages** — Check that 404 pages exist and are functional
- [ ] **4.4 Redirects** — Detect redirect chains, check for proper 301 vs 302 usage
- [ ] **4.10 CDN usage** — Detect CDN headers, check static resource distribution
- [ ] **4.7 Data refresh** — Check for appropriate cache TTLs

**Deliverable:** ~17 additional automated checks covering WSG Sections 2 and 4.

---

## Phase 6: Report Module

**Goal:** Generate clear, actionable sustainability reports in multiple formats.

### 6.1 Report Data Model

- [ ] Create `src/report/types.ts`

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
  }
}
```

### 6.2 Report Formatters

- [ ] Create `src/report/formatters/json.ts` — Raw JSON output
- [ ] Create `src/report/formatters/markdown.ts` — Markdown report
- [ ] Create `src/report/formatters/html.ts` — Styled HTML report
- [ ] Create `src/report/formatters/terminal.ts` — Colorized terminal output with tables

### 6.3 Recommendations Engine

- [ ] Create `src/report/recommendations.ts`
- [ ] Map each failed/warned check to actionable improvement steps
- [ ] Prioritize recommendations by impact level
- [ ] Include links to relevant WSG resources and success criteria

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
| Caching and offline access                       | 4.2  | Yes       | 5     |
| Compression                                      | 4.3  | Yes       | 5     |
| Error pages and redirects                        | 4.4  | Yes       | 5     |
| CDN usage                                        | 4.10 | Partial   | 5     |

### Manual/Advisory (Reported as guidelines, not checked — future phases)

| Guideline                  | ID   | Notes                                |
| -------------------------- | ---- | ------------------------------------ |
| External factors           | 2.1  | Manual review required               |
| User requirements          | 2.2  | Manual review required               |
| Sustainability in ideation | 2.3  | Process-oriented                     |
| Design to assist           | 2.6  | Manual UX review                     |
| Deceptive patterns         | 2.7  | Partially automatable                |
| Deliverables reuse         | 2.8  | Process-oriented                     |
| Design systems             | 2.9  | Manual review                        |
| Clear content              | 2.10 | NLP analysis potential (future)      |
| Sustainable hosting        | 4.1  | Requires hosting provider info       |
| Database queries           | 3.20 | Requires server access               |
| All Section 5 (Business)   | 5.x  | Organizational, not machine-testable |

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
- **Carbon footprint estimation** — Integrate with CO2.js for emissions estimates
- **Headless browser mode** — Use Playwright for JS-rendered content analysis
- **Compare mode** — Compare two URLs or track improvements over time
- **Badge/widget** — Embeddable sustainability score badge for websites
- **API v2** — WebSocket support for real-time check progress
