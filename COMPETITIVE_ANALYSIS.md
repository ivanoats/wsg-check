# Competitive Analysis: WSG-Check vs Existing Web Sustainability Tools

> **Purpose:** Compare the WSG-Check implementation plan against existing tools in the web sustainability space. Identify gaps, overlaps, and unique differentiators. Recommend adjustments to the roadmap — **no implementation in this document**.
>
> **Date:** February 2026

---

## Table of Contents

1. [Tools Surveyed](#1-tools-surveyed)
2. [Feature Comparison Matrix](#2-feature-comparison-matrix)
3. [Tool Deep-Dives](#3-tool-deep-dives)
   - [EcoGrader](#31-ecograder-ecogradercom)
   - [Digital Beacon](#32-digital-beacon-digitalbeaconco)
   - [Website Carbon Calculator](#33-website-carbon-calculator-websitecarboncom)
   - [CO2.js](#34-co2js-tgwfco2)
   - [SquareEye Sustainability Audit Guide](#35-squareeye-sustainability-audit-guide)
   - [Sitespeed.io + Coach](#36-sitespeedio--coach)
   - [GreenFrame](#37-greenframe-greenframeio)
4. [WSG-Check Differentiators](#4-wsg-check-differentiators)
5. [Gaps in WSG-Check Plan](#5-gaps-in-wsg-check-plan)
6. [Recommendations](#6-recommendations)
7. [Implementation Priority Summary](#7-implementation-priority-summary)

---

## 1. Tools Surveyed

| Tool | Type | Free/Open | Primary Metric | WSG Mapping |
|---|---|---|---|---|
| [EcoGrader](https://ecograder.com) | Web app | Free | 0-100 score + CO2/page | ❌ |
| [Digital Beacon](https://digitalbeacon.co) | Web app | Free | A+ – F grade + CO2/page | ❌ |
| [Website Carbon Calculator](https://websitecarbon.com) | Web app + API | Free | CO2g/page view | ❌ |
| [CO2.js](https://github.com/thegreenwebfoundation/co2.js) | npm library | Open (Apache-2.0) | bytes → CO2e | ❌ |
| [SquareEye Guide](https://squareeye.com/how-to-audit-and-optimise-your-website-for-sustainability/) | Manual audit guide | Free (content) | Manual checklist | Partial |
| [Sitespeed.io + Coach](https://www.sitespeed.io/) | CLI / Docker | Open (MIT) | Performance + sustainability | ❌ |
| [GreenFrame](https://greenframe.io) | SaaS monitoring | Freemium | Scenario energy (µWh) | ❌ |
| **WSG-Check** _(planned)_ | Web app + CLI + API | Open (planned) | Per-guideline pass/fail + score | ✅ Full |

---

## 2. Feature Comparison Matrix

| Feature | EcoGrader | Digital Beacon | Website Carbon | CO2.js | Sitespeed.io | WSG-Check (planned) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Carbon/CO2 estimate per page** | ✅ | ✅ | ✅ | ✅ (library) | ✅ | ❌ Future |
| **Green hosting check** | ✅ | ✅ | ✅ | ✅ (API) | ✅ | ❌ Not planned |
| **Page weight / transfer size** | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| **Compression check (gzip/brotli)** | ❌ | ✅ | ❌ | — | ✅ | ✅ |
| **Image format check (WebP/AVIF)** | ✅ | ✅ | ❌ | — | ✅ | ✅ |
| **Lazy loading check** | ✅ | ✅ | ❌ | — | ✅ | ✅ |
| **Cache headers analysis** | ❌ | ✅ | ❌ | — | ✅ | ✅ |
| **Third-party script audit** | ❌ | ✅ (count) | ❌ | — | ✅ | ✅ |
| **Core Web Vitals / PageSpeed** | ✅ (via PSI) | ❌ | ❌ | — | ✅ | ❌ Not planned |
| **Security headers check** | ❌ | ❌ | ❌ | — | ❌ | ✅ |
| **Semantic HTML analysis** | ❌ | ❌ | ❌ | — | ❌ | ✅ |
| **Preference media queries** | ❌ | ❌ | ❌ | — | ❌ | ✅ |
| **Redirect chain analysis** | ❌ | ❌ | ❌ | — | ✅ | ✅ |
| **`carbon.txt` / `robots.txt` / `security.txt`** | ❌ | ❌ | ❌ | — | ❌ | ✅ |
| **Font optimization checks** | ❌ | ❌ | ❌ | — | ❌ | ✅ |
| **ARIA / accessibility signals** | ❌ | ❌ | ❌ | — | ❌ | ✅ |
| **Full W3C WSG guideline mapping** | ❌ | ❌ | ❌ | — | ❌ | ✅ |
| **CLI interface** | ❌ | ❌ | ❌ | ✅ (lib) | ✅ | ✅ |
| **CI/CD integration** | ❌ | ❌ | ❌ | ✅ (lib) | ✅ | ✅ (planned) |
| **Multiple output formats** | ❌ | ❌ | JSON API | — | JSON/HTML | ✅ JSON/MD/HTML/terminal |
| **Multi-page crawling** | ❌ | ❌ | ❌ | — | ✅ | ✅ (planned) |
| **Country-level grid intensity** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ Not planned |
| **Open source / self-hostable** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## 3. Tool Deep-Dives

### 3.1 EcoGrader (ecograder.com)

**Created by:** Mightybytes  
**Access:** Free web app

**What it checks:**

- **Page Design** — Image formats (prefers WebP/AVIF), presence of large images, lazy loading on below-the-fold images
- **Green Hosting** — Queries the [Green Web Foundation API](https://www.thegreenwebfoundation.org/tools/green-web-dataset/) to determine if the host uses renewable energy
- **Performance** — Integrates with Google PageSpeed Insights (PSI) to retrieve the Lighthouse performance score as a proxy for efficiency
- **Clean Energy CDN** — Checks whether the CDN(s) serving static assets are powered by clean energy

**Output:** A single 0–100 sustainability score, broken down by the above four dimensions, plus an estimated CO2 per page view (using the Sustainable Web Design methodology).

**Strengths:**
- Very easy to use; non-technical audience friendly
- Unique PageSpeed integration brings real-browser rendering metrics
- Green hosting check is a user expectation (people ask "is this site green?")
- Clean Energy CDN dimension has no WSG-Check equivalent

**Limitations:**
- No W3C WSG guideline mapping
- Web-only; no CLI, no API
- Shallow checks — no security headers, semantic HTML, font analysis, preference queries
- Black box scoring; hard to act on individual failed checks
- Cannot be integrated into CI/CD pipelines

**Relationship to WSG-Check:** EcoGrader is a quick "sustainability temperature check" for non-technical users. WSG-Check targets developers who need per-guideline detail and CI/CD integration.

---

### 3.2 Digital Beacon (digitalbeacon.co)

**Created by:** Wholegrain Digital  
**Access:** Free web app

**What it checks:**

- **Data transfer** — Total page weight (HTML + CSS + JS + images + fonts + media)
- **Requests count** — Total HTTP requests
- **Green hosting** — Via Green Web Foundation API
- **Caching quality** — Presence of `Cache-Control`, `ETag`, `Expires` headers
- **Image optimization** — Formats and compression
- **Lazy loading** — Detects `loading="lazy"` on images
- **Compression** — Detects gzip/brotli encoding
- **Third-party scripts** — Count of third-party requests

**Output:** Letter grade (A+ to F) plus an estimated grams of CO2 per page view, with per-dimension breakdowns.

**Methodology:** [Sustainable Web Design v3](https://sustainablewebdesign.org/), the same model that underpins CO2.js and Website Carbon Calculator.

**Strengths:**
- Letter grade is intuitive and sharable
- Broader technical checks than EcoGrader (caching, compression)
- Good for quick audits with a clear summary

**Limitations:**
- No W3C WSG mapping
- Web-only
- No security checks, semantic HTML, preference media queries
- No CLI or API

**Relationship to WSG-Check:** Digital Beacon overlaps with WSG-Check in the caching, compression, and image checks (phases 4–5). WSG-Check should produce equivalent detail on those dimensions while adding the WSG guideline context.

---

### 3.3 Website Carbon Calculator (websitecarbon.com)

**Created by:** Wholegrain Digital  
**Access:** Free web app + [public API](https://api.websitecarbon.com/)

**What it does:**

Converts a URL into an estimated CO2 per page view using two inputs:
1. **Page weight** — either from a fetch or provided directly
2. **Green hosting** — from the Green Web Foundation dataset

The estimate applies the **Sustainable Web Design (SWD) methodology** which distributes energy consumption across data centres, networks, and end-user devices as a proportion of data transferred.

**API endpoint:** `https://api.websitecarbon.com/site?url=<url>` — returns JSON with `statistics.co2.renewable.grams` and `statistics.co2.grid.grams`.

**Strengths:**
- The industry-standard baseline for CO2 estimation
- API is free, widely used, and trusted
- Simple integration into other tools

**Limitations:**
- CO2 estimate only; no guidance on improvement
- No WSG mapping
- No checks beyond page weight and hosting

**Relationship to WSG-Check:** The Website Carbon API could be an optional data source for WSG-Check's carbon estimation feature (see [Recommendation R1](#r1-integrate-co2js-for-carbon-estimation)). However, calling a third-party API introduces a dependency. CO2.js (see §3.4) is a better choice for an open-source tool.

---

### 3.4 CO2.js (`@tgwf/co2`)

**Created by:** Green Web Foundation  
**Access:** Open source (Apache 2.0), published on npm as `@tgwf/co2`  
**Version as of Feb 2026:** v0.17.x (v0.18 imminent, switching default model to SWD v4)

**What it provides:**

CO2.js is a **library**, not a checker. It gives developers the building blocks to estimate emissions:

1. **Carbon estimation models:**
   - `OneByte` — the original simple model (bytes / 1kWh baseline)
   - `SustainableWebDesign` (SWD) — more nuanced model splitting consumption across data centres, networks, and devices
     - v3 is the current default (changing to v4 in v0.18)

2. **Green hosting lookup (`hosting.js`):**  
   Queries the Green Web Foundation's dataset (either their API or a bundled offline snapshot) to check whether a domain is served from infrastructure powered by verified renewable energy.

3. **Grid intensity data:**  
   Bundled annual, country-level average and marginal grid intensity data from Ember and the UNFCCC. Useful for country-specific emissions estimates.

**Usage example:**
```js
import { co2, hosting } from '@tgwf/co2';

// Carbon estimate
const swd = new co2({ model: 'swd', version: 4 });
const grams = swd.perByte(pageWeightInBytes, isGreenHosted);

// Green hosting check (requires API call or offline dataset)
const isGreen = await hosting.check('example.com');
```

**Strengths:**
- Battle-tested, widely adopted (used by Digital Beacon, Sitespeed.io, WebPageTest, and others)
- TypeScript types via `@types/tgwf__co2`
- ESM and CJS builds — fully compatible with this project's stack
- Green hosting check built in
- Country-specific emissions data
- Apache 2.0 license

**Limitations:**
- Library only — no HTML analysis, no checks
- Does not map to WSG guidelines
- SWD methodology is an approximation; it estimates based on bytes transferred, not measured energy

**Relationship to WSG-Check:**  
CO2.js is currently in the "Future Enhancements" section of `IMPLEMENTATION_PLAN.md`. It should be promoted to a concrete phase — see [Recommendation R1](#r1-integrate-co2js-for-carbon-estimation) and [R2](#r2-add-green-hosting-check).

---

### 3.5 SquareEye Sustainability Audit Guide

**URL:** https://squareeye.com/how-to-audit-and-optimise-your-website-for-sustainability/  
**Type:** Editorial / manual audit guide (not a tool)

**What it covers:**

The SquareEye guide is a practitioner-written checklist for auditing a website's sustainability manually. It spans:

- **Measurement baseline** — Using Website Carbon or EcoGrader to establish a starting point
- **Images** — Optimising formats (WebP, AVIF), dimensions, and compression; removing unnecessary decorative images
- **Video** — Avoiding auto-play, offering lower-quality options, hosting video on specialist platforms
- **Fonts** — Subsetting, preferring system fonts, using `font-display: swap`
- **JavaScript** — Removing unused code, deferring non-critical scripts, auditing third-party scripts
- **CSS** — Minifying, removing unused rules, avoiding CSS-in-JS overhead
- **Hosting** — Choosing a green host; CDN for static assets
- **Caching** — Aggressive cache headers for immutable assets
- **Dark/eco mode** — Implementing `prefers-color-scheme` dark mode as an energy-saving feature (particularly relevant for OLED screens)
- **Content strategy** — Removing stale pages, avoiding duplication, content-first design
- **Measurement and iteration** — Re-auditing after changes to confirm improvement

**Strengths:**
- Holistic — covers organisational and content concerns that no automated tool can
- Practical; actionable steps for non-engineers
- Dark/eco mode framing is distinct from WSG's `prefers-color-scheme` check — highlights the energy-saving motivation on OLED displays

**Limitations:**
- Manual process; no automation
- Does not map to WSG guidelines
- Not repeatable as CI/CD checks

**Relationship to WSG-Check:**  
The SquareEye guide validates that WSG-Check's planned checks (images, fonts, JS deferral, caching, preference queries) are the right priorities. It also highlights that **dark mode as an energy-saving strategy** deserves its own recommendation in WSG-Check's report output, beyond just detecting `prefers-color-scheme` (WSG 3.12).

---

### 3.6 Sitespeed.io + Coach

**URL:** https://www.sitespeed.io/  
**Type:** Open-source CLI + Docker  
**License:** MIT

**What it checks:**

Sitespeed.io is a comprehensive performance testing framework. Its **Coach** module provides sustainability-relevant advice:

- Page weight budget
- Number of requests
- JavaScript bundle size
- Render-blocking resources
- Image optimisation
- Caching headers
- Compression
- Third-party requests
- CO2 estimate via CO2.js integration

Sitespeed.io uses a **real browser** (Chrome/Firefox via Selenium or Puppeteer) so it captures:
- JavaScript-rendered content
- Network waterfall
- Core Web Vitals (LCP, CLS, FID/INP)
- Actual transfer sizes after CDN and server-side compression

**Strengths:**
- Real browser rendering — catches what static analysis misses
- Already integrates CO2.js
- Highly scriptable; used in CI pipelines
- Multi-page support built in
- Docker image available

**Limitations:**
- Performance-centric; no WSG guideline mapping
- Heavy — requires browser binary; not suitable for a lightweight SaaS
- Requires more infrastructure than a Node.js HTTP fetch

**Relationship to WSG-Check:**  
Sitespeed.io is a complement, not a competitor. WSG-Check's check-as-function pattern and static analysis approach covers a different surface (semantic HTML, ARIA, security headers, WSG files) that Sitespeed.io doesn't touch. A future "headless browser mode" in WSG-Check (already listed as a future enhancement) would bring WSG-Check closer to Sitespeed.io on the performance side.

---

### 3.7 GreenFrame (greenframe.io)

**URL:** https://greenframe.io/  
**Type:** SaaS monitoring tool  
**Access:** Freemium

**What it does:**

GreenFrame measures the **actual energy consumption** of user journeys using Puppeteer-driven scenarios. It instruments the browser, CPU, and network to measure real energy use (in µWh), not an estimate from bytes. It integrates into CI pipelines to detect energy regressions.

**Strengths:**
- Measures actual energy rather than estimating from bytes
- Scenario-based: catches JS-heavy pages that static analysis cannot
- CI integration with regression detection
- Budget alerts

**Limitations:**
- Proprietary SaaS; not open source
- Requires writing test scenarios (Playwright/Puppeteer scripts)
- High setup barrier for quick audits
- No WSG mapping

**Relationship to WSG-Check:**  
GreenFrame occupies the "deep monitoring" niche. WSG-Check targets the "quick audit" niche. There is little direct overlap, but WSG-Check reports could recommend GreenFrame for teams that need scenario-based energy monitoring.

---

## 4. WSG-Check Differentiators

WSG-Check has a genuinely unique position in the ecosystem. No existing tool does all of the following:

1. **Full W3C WSG mapping** — WSG-Check is the only planned tool that checks every automatable guideline across WSG Sections 2, 3, and 4 and links results back to specific WSG IDs (e.g., "3.12 — Preference media queries"). This is a clear, defensible differentiator.

2. **Semantic HTML and ARIA analysis** — No competitor inspects heading hierarchy, landmark usage, skip-nav links, or ARIA attributes as sustainability/accessibility signals.

3. **Security headers as a sustainability check** — WSG-Check connects secure code (WSG 3.15) to sustainability via the `CheckResult` model, while competitors treat security as entirely separate.

4. **`carbon.txt`, `security.txt`, `humans.txt` verification** — No other tool checks for the presence of these beneficial files.

5. **Preference media queries audit** — `prefers-reduced-motion`, `prefers-color-scheme`, and `prefers-reduced-data` detection is unique to WSG-Check's planned scope.

6. **CLI + CI/CD integration** — Only Sitespeed.io matches this, but Sitespeed is much heavier and not WSG-aligned.

7. **Multiple structured output formats** — JSON, Markdown, HTML, and terminal output with a single tool.

8. **Open source and self-hostable web app** — EcoGrader, Digital Beacon, and Website Carbon are proprietary SaaS tools.

---

## 5. Gaps in WSG-Check Plan

The following are capabilities that competitors provide and that are absent from or under-specified in the current `IMPLEMENTATION_PLAN.md`:

### Gap 1: No CO2 / Carbon Footprint Estimate

Every major competitor surfaces an estimated grams of CO2 per page view as the headline metric. WSG-Check relegates CO2.js integration to "Future Enhancements." This is a strategic mistake: **users expect a carbon number**. Without it, WSG-Check will feel incomplete compared to Digital Beacon or EcoGrader even when it provides far more guideline detail.

**Relevant plan section:** Phase 3 (Core Module), mentioned in "Future Enhancements"  
**Effort to fix:** Low — CO2.js is small, ESM-native, Apache 2.0, and directly applicable

### Gap 2: No Green Hosting Check

All four competitor tools check whether the target website is hosted on infrastructure verified to use renewable energy. This check uses the [Green Web Foundation API](https://www.thegreenwebfoundation.org/tools/green-web-dataset/) (or the bundled offline dataset in CO2.js). It is the single most impactful sustainability factor for most websites, and its absence will be noticed.

**Relevant WSG guideline:** WSG 4.9 (Use a content delivery network) and 4.8 (Choose green hosting) — the latter exists in the WSG but is not currently listed in the WSG-Check coverage matrix.  
**Effort to fix:** Low — CO2.js `hosting.js` module provides this directly

### Gap 3: No Performance Score / Core Web Vitals Integration

EcoGrader integrates Google PageSpeed Insights (PSI) to retrieve a real performance score. Static HTML analysis cannot measure Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), or other Core Web Vitals. These are relevant to WSG 3.1 (performance goals) and 3.8 (deferred non-critical resources).

**Relevant plan section:** Phase 4 (Checks 3.1, 3.8)  
**Note:** A full PSI integration requires an API key. A lighter alternative is linking to a PSI URL in the report. The gap is at least partially addressable via Lighthouse CI.  
**Effort to fix:** Medium — requires either a PSI API call or headless browser mode (future enhancement)

### Gap 4: Transfer Sizes vs. Source Sizes

WSG-Check's `resource-analyzer.ts` computes sizes from HTML source analysis. This misses:
- CDN-level compression applied server-side after analysis
- Actual network transfer size (which differs from source size)
- Resources loaded dynamically by JavaScript

Competitors that use real browsers (Sitespeed.io, GreenFrame) capture actual transfer sizes. For static analysis tools (Digital Beacon, EcoGrader), this is an accepted limitation, but it should be clearly disclosed in WSG-Check's report output.

**Effort to fix:** Medium (partial) — add a disclaimer in report output; full fix requires headless browser mode

### Gap 5: Dark Mode as an Energy-Saving Feature

The SquareEye guide explicitly positions dark mode (`prefers-color-scheme: dark`) as an energy-saving feature for OLED screens, distinct from its accessibility value. WSG-Check plans to check for `prefers-color-scheme` support (WSG 3.12), but the current plan does not frame the check with the OLED energy angle. This framing makes the recommendation more compelling and actionable.

**Effort to fix:** Trivial — improve the recommendation text for the `prefers-color-scheme` check when implemented

### Gap 6: WSG 4.8 (Green Hosting) Missing from Coverage Matrix

The WSG-Check coverage matrix in `IMPLEMENTATION_PLAN.md` includes WSG 4.2 (caching), 4.3 (compression), 4.4 (error pages), 4.4 (redirects), and 4.10 (CDN), but **WSG 4.8 (hosting provider) is absent**. This is the most impactful hosting check and aligns directly with the green hosting feature all competitors offer.

**Effort to fix:** Low — add WSG 4.8 to Phase 5 coverage matrix and implement with CO2.js

### Gap 7: Country-Specific Grid Intensity

CO2.js includes per-country grid intensity data. WSG-Check makes no use of this. A CO2 estimate that accounts for where a site's servers and audience are located is more accurate than a global average. This is a "nice to have" but would make WSG-Check's carbon estimate more sophisticated than competitors.

**Effort to fix:** Medium — requires user input (country selection) or geo-detection; defer to a v2 feature

---

## 6. Recommendations

The following recommendations are ordered by impact and ease of implementation. None of them require changing the overall architecture.

---

### R1: Integrate CO2.js for Carbon Estimation (Priority: **High**)

**What:** Add `@tgwf/co2` as a dependency. In Phase 3 (Core Module) or Phase 6 (Report Module), after `analyzePageWeight()` returns the total transfer size, pass that byte count through `co2.perByte()` using the Sustainable Web Design v4 model to produce a grams-of-CO2-per-page-view estimate. Expose it as a top-level field in `SustainabilityReport`.

**Why:** Every competitor shows a carbon number. Users expect it. CO2.js is:
- Apache 2.0 licensed
- ESM-native (compatible with this project's `"type": "module"`)
- Small (~15 KB)
- Already used by Digital Beacon, Sitespeed.io, and WebPageTest
- Well-maintained by the Green Web Foundation (v0.18 in Feb 2026)

**Suggested phase:** Promote from "Future Enhancements" to **Phase 3 or Phase 6**. The byte count is already computed by `resource-analyzer.ts`.

**Before integrating, check vulnerability status:**
```
npm install @tgwf/co2
```
Run `npm audit` after adding.

**Example integration point** (pseudocode, do not implement):
```ts
// In SustainabilityReport metadata
metadata: {
  pageWeight: number        // bytes (already planned)
  co2PerPageView: number    // grams — NEW
  co2Model: 'swd-v4'       // which model was used — NEW
}
```

---

### R2: Add Green Hosting Check via CO2.js (Priority: **High**)

**What:** Use `hosting.check(domain)` from CO2.js to query the Green Web Foundation API and determine whether the target site's primary domain is served from verified renewable-energy infrastructure. Expose the result as a dedicated check tied to **WSG 4.8**.

**Why:**
- All competitors (EcoGrader, Digital Beacon, Website Carbon) provide this check
- It is the highest-impact single factor affecting a site's carbon footprint
- CO2.js bundles an offline snapshot of the GWF dataset, so it works without a live API call (important for rate-limit resilience)
- WSG 4.8 (hosting provider sustainability) is currently missing from the WSG-Check coverage matrix

**Suggested phase:** Add to **Phase 5 (Hosting Checks, Section 4)** alongside 4.2, 4.3, and 4.4.

**Add WSG 4.8 to the guidelines registry** with:
```
ID: 4.8
Title: Choose a sustainable hosting provider
Category: hosting
Machine-testable: true (green hosting API lookup)
```

---

### R3: Frame `prefers-color-scheme` Check with OLED Energy Context (Priority: **Medium**)

**What:** When WSG 3.12 (`prefers-color-scheme`) is implemented, include in the check's recommendation text that dark mode reduces energy consumption on OLED screens by up to 47% (Google research), in addition to its accessibility benefits.

**Why:** The SquareEye guide identifies this as a concrete, motivating energy-saving reason for dark mode — not just an aesthetic preference. This improves the quality of WSG-Check's recommendations and differentiates the reporting from a pure accessibility audit.

**Suggested phase:** Address in Phase 4, check implementation for WSG 3.12.

---

### R4: Add Performance Score Disclaimer and Lighthouse CI Link (Priority: **Medium**)

**What:** In the report output for WSG 3.1 (performance goals) and 3.8 (deferred resources), add a note that static HTML analysis cannot measure Core Web Vitals and link to Google PageSpeed Insights (`https://pagespeed.web.dev/report?url=<encoded-url>`) for a live performance score. Alternatively, document integration with Lighthouse CI as a companion tool.

**Why:** EcoGrader's PageSpeed integration is consistently cited as a strength. WSG-Check cannot replicate it easily (requires a browser or API key), but acknowledging the gap and directing users to the right tool avoids WSG-Check appearing incomplete.

**Suggested phase:** Address in Phase 6 (Report Module / Recommendations Engine).

---

### R5: Add WSG 4.8 (Green Hosting) to the Coverage Matrix (Priority: **High**)

**What:** Update the WSG Guidelines Coverage Matrix in `IMPLEMENTATION_PLAN.md` to include WSG 4.8. This is a documentation gap that should be corrected before the Phase 5 work begins.

**Why:** WSG 4.8 is an explicitly automatable guideline (it can be checked via the GWF API). Its omission is likely an oversight. It is the most visible hosting sustainability check.

---

### R6: Disclose Static-Analysis Limitations in Report Output (Priority: **Low**)

**What:** Add a `methodology` section to the `SustainabilityReport` type that explains:
1. That analysis is performed via static HTML/HTTP analysis without a browser
2. That resource sizes are measured from source, not actual CDN-compressed transfer sizes
3. That JavaScript-rendered content is not evaluated

**Why:** Digital Beacon and EcoGrader make similar trade-offs without disclosing them. WSG-Check's open-source transparency is a differentiator. Users who also use Sitespeed.io or GreenFrame will understand the complementary role.

---

### R7: Consider a CO2.js Country-Specific Estimate as a v2 Feature (Priority: **Low**)

**What:** Offer an optional user input (or auto-detect from server IP location) to use country-specific average grid intensity from CO2.js's bundled Ember dataset, producing a more accurate CO2 estimate. Document this as a planned v2 feature.

**Why:** The global SWD average is a simplification. A UK-hosted site has a markedly different grid intensity than a coal-heavy region. CO2.js already includes the data; it is just a matter of exposing the option.

**Suggested phase:** v2 enhancement, not core roadmap.

---

### R8: Acknowledge Complementary Tools in Reports and Documentation (Priority: **Low**)

**What:** In the WSG-Check report output and documentation, recommend complementary tools for dimensions WSG-Check does not cover:
- GreenFrame for scenario-based energy monitoring
- Sitespeed.io for performance-with-sustainability analysis
- Google PageSpeed Insights / Lighthouse for Core Web Vitals

**Why:** WSG-Check occupies a distinct niche (WSG-aligned, static analysis, CI-friendly). Positioning it as part of an ecosystem rather than a replacement for all tools avoids overselling and builds community trust.

---

## 7. Implementation Priority Summary

The following table summarises which recommendations should be folded into the existing implementation plan phases:

| Recommendation | Phase | Effort | Impact |
|---|---|---|---|
| R1: CO2.js carbon estimation | Phase 3 or 6 | Low (1–2 days) | High — matches user expectations |
| R2: Green hosting check (WSG 4.8) | Phase 5 | Low (0.5 day) | High — all competitors have this |
| R5: Add WSG 4.8 to coverage matrix | IMPLEMENTATION_PLAN.md update | Trivial | High (enables R2) |
| R3: OLED energy framing for dark mode | Phase 4, WSG 3.12 | Trivial | Medium — improves recommendations |
| R4: PageSpeed disclaimer + link | Phase 6 | Low | Medium — manages expectations |
| R6: Methodology disclosure | Phase 6 | Low | Low — transparency |
| R7: Country-specific CO2 estimate | v2 | Medium | Low (future) |
| R8: Complementary tools references | Docs / Phase 6 | Trivial | Low — ecosystem positioning |

### Revised Phasing Impact

With R1, R2, and R5 incorporated:

1. **Phase 3 (Core Module):** Add CO2.js as a dependency; compute `co2PerPageView` from `pageWeight` bytes as part of the orchestration pipeline.
2. **Phase 5 (Hosting Checks):** Add WSG 4.8 entry to guidelines registry; implement green hosting check using `hosting.check()` from CO2.js.
3. **Phase 6 (Report Module):** Surface `co2PerPageView`, `isGreenHosted`, and a methodology disclaimer in `SustainabilityReport`. Add PageSpeed Insights link in WSG 3.1/3.8 recommendations.

These three additions require **~1.5–2.5 days of additional effort** and would close the most visible gaps against every existing competitor.

---

*This document was produced as part of the WSG-Check project analysis. It is intended to inform the roadmap; implementation decisions rest with the project maintainer.*
