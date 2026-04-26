# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.3](https://github.com/ivanoats/wsg-check/compare/v0.1.2...v0.1.3) (2026-04-26)


### Fixed

* gemini code review ([#147](https://github.com/ivanoats/wsg-check/issues/147)) ([90ad922](https://github.com/ivanoats/wsg-check/commit/90ad922c3651058c8658b83985af0853e22cd7f8))


### Changed

* add RELEASING.md runbook for npm release flow ([#143](https://github.com/ivanoats/wsg-check/issues/143)) ([316de25](https://github.com/ivanoats/wsg-check/commit/316de2577e170c012331fc56f1d0c30ca51e4939))


### Dependencies

* **deps-dev:** bump jsdom from 28.1.0 to 29.0.2 ([#146](https://github.com/ivanoats/wsg-check/issues/146)) ([efcc58e](https://github.com/ivanoats/wsg-check/commit/efcc58e7212bc1046d719030d813b8919c427616))
* **deps:** bump @ark-ui/react in the production-minor-patch group ([#145](https://github.com/ivanoats/wsg-check/issues/145)) ([d3dee78](https://github.com/ivanoats/wsg-check/commit/d3dee78c0f072c0de70740f6d7cf1e637d4a2bba))
* **deps:** bump googleapis/release-please-action ([#144](https://github.com/ivanoats/wsg-check/issues/144)) ([5bfa953](https://github.com/ivanoats/wsg-check/commit/5bfa95335207a79c285da029ee05c86a884b4185))

## [Unreleased]

### Added

- Phase 10 documentation: `CONTRIBUTING.md` development setup guide and this `CHANGELOG.md`
- npm security override for `rollup` to patch high-severity path-traversal vulnerability (GHSA-mw96-cpmx-2vgc)

---

## [0.0.1] — 2025-01-01

### Added

#### Phase 0 — Project Scaffolding

- Next.js 15 + React 19 application scaffold with TypeScript strict mode
- Panda CSS + Park UI component library integration
- ESLint, Prettier, Husky, and lint-staged for code quality
- Vitest test runner with coverage (v8 provider)
- Playwright for end-to-end tests

#### Phase 1 — Configuration Module (`src/config/`)

- `resolveConfig` loader merging file config, environment variables, and CLI flags
- `defaults.ts` with typed default configuration values
- `guidelines-registry.ts` mapping WSG guideline IDs to metadata
- W3C WSG API client (`wsg-api-client.ts`) with static fallback

#### Phase 2 — Utils Module (`src/utils/`)

- `HttpClient` (Axios-based) with SSRF protection and configurable retries
- `parseHtml` (Cheerio-based) HTML parser
- `analyzePageWeight` resource analyser with per-type breakdown
- `estimateCO2` / `checkGreenHosting` carbon estimator via `@tgwf/co2`
- `createLogger` structured logger (terminal / JSON modes)
- Custom error classes: `FetchError`, `ParseError`, `CheckError`

#### Phase 3 — Core Module (`src/core/`)

- `WsgChecker` — main entry point orchestrating fetch → check → score pipeline
- `CheckRunner` — parallel check execution with `Promise.allSettled`
- `scoreResults` — weighted category scoring (0–100)

#### Phase 4 — Web Development Checks (`src/checks/`)

Performance & Efficiency:

- `page-weight` (WSG 3.14) — total page size and per-type budgets
- `caching` (WSG 3.16) — cache-control header presence
- `minification` (WSG 3.8) — HTML/JS/CSS minification detection
- `render-blocking` (WSG 3.7) — render-blocking resource detection
- `lazy-loading` (WSG 3.9) — image lazy-loading attribute check
- `dependency-count` (WSG 3.18) — third-party script count
- `data-refresh` (WSG 3.20) — auto-refresh meta tag detection
- `cdn-usage` (WSG 3.17) — CDN usage heuristic
- `redirects` (WSG 3.15) — HTTP redirect chain length

Semantic & Standards:

- `semantic-html` (WSG 3.2) — landmark element usage
- `alt-text` (WSG 3.3) — image alt attribute presence
- `html-version` (WSG 3.1) — HTML5 doctype check
- `metadata` (WSG 3.5) — title and meta description presence
- `font-stack-fallbacks` (WSG 3.6) — web-safe font-stack fallbacks
- `error-pages` (WSG 3.12) — 404 / error page detection

Sustainability-Specific:

- `sustainable-js` (WSG 3.11) — JavaScript bundle size heuristics
- `third-party` (WSG 3.10) — third-party request count
- `optimized-media` (WSG 3.4) — next-gen image format usage
- `non-essential-content` (WSG 3.13) — auto-play media detection
- `redundancy` (WSG 3.19) — duplicate resource detection

Security & Maintenance:

- `security-headers` (WSG 3.22) — HSTS, CSP, X-Frame-Options presence
- `expected-files` (WSG 3.21) — robots.txt, sitemap.xml, favicon presence

#### Phase 5 — UX & Hosting Checks

UX Design (Section 2):

- `animation-control` (WSG 2.12) — prefers-reduced-motion media query
- `preference-media-queries` (WSG 2.11) — media query feature usage
- `deceptive-patterns` (WSG 2.6) — dark-pattern heuristic
- `minimal-forms` (WSG 2.9) — unnecessary form field detection
- `navigation-structure` (WSG 2.3) — nav landmark and skip-link check
- `web-typography` (WSG 2.10) — font loading strategy
- `accessibility-aids` (WSG 2.4) — ARIA landmark and heading hierarchy
- `downloadable-documents` (WSG 2.7) — document link format hints
- `offline-access` (WSG 2.13) — service worker detection
- `responsive-design` (WSG 2.2) — viewport meta tag presence

Hosting & Infrastructure (Section 4):

- `sustainable-hosting` (WSG 4.1) — green-hosting database lookup
- `renewable-energy` (WSG 4.2) — green-energy policy page heuristic

#### Phase 6 — Report Module (`src/report/`)

- `SustainabilityReport` data model with `fromRunResult` constructor
- `formatJson` — machine-readable JSON output
- `formatMarkdown` — GitHub-flavoured Markdown report
- `formatHtml` — standalone HTML report with inline styles
- `formatTerminal` — ANSI-coloured terminal output with grade badges
- Category recommendations engine

#### Phase 7 — CLI Module (`src/cli/`)

- `wsg-check <url>` command via `commander`
- Options: `--format`, `--output`, `--categories`, `--guidelines`, `--fail-threshold`, `--verbose`, `--config`
- TTY-aware spinner on stderr
- Exit codes: `0` (success / above threshold), `1` (error / below threshold)

#### Phase 8 — API Module (`src/api/`)

- `POST /api/check` — on-demand sustainability check
- `GET /api/check/:id` — fetch a stored check result
- `GET /api/guidelines` — list WSG guidelines (W3C API with static fallback)
- `GET /api/guidelines/:id` — single guideline lookup
- `GET /api/health` — health endpoint
- `GET /api/openapi` — OpenAPI 3.1 specification
- CORS headers, shared error envelopes, in-memory rate limiting

#### Phase 9 — Frontend Module (`src/app/`)

- Home page with URL input form and check trigger
- Results page with grade badge, category scores, and check-level details
- About page with WSG overview and grading scale
- Guidelines browser page
- Bottom navigation (mobile-first, thumb-friendly)
- Dark/light mode support
- Service worker registration for offline access
- Accessibility: skip links, ARIA landmarks, pa11y-ci integration
- Performance: Lighthouse CI integration

#### Phase 10 — Testing & QA

- 77 test files / 966 tests; 97.9% statement coverage
- Integration test: full URL → Check → Report pipeline
- CLI integration tests (15 scenarios)
- API endpoint tests (check-routes, guidelines-routes, health, openapi, validation, cors, rate-limit, store)
- Playwright E2E tests with mobile-device emulation
- pa11y-ci accessibility tests (`npm run test:a11y`)
- Lighthouse CI performance tests (`npm run test:lighthouse`)
- CI pipeline: lint → type-check → test/coverage → build → a11y → lighthouse
- Codecov and DeepSource coverage reporting

[Unreleased]: https://github.com/ivanoats/wsg-check/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/ivanoats/wsg-check/releases/tag/v0.0.1
