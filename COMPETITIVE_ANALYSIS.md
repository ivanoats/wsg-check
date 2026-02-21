# Competitive Analysis: WSG-Check vs Existing Web Sustainability Tools

> **Purpose:** Compare the WSG-Check implementation plan against existing tools in the web sustainability space. Identify gaps, overlaps, and unique differentiators. Recommend adjustments to the roadmap — **no implementation in this document**.
>
> **Date:** February 2026 (updated after direct review of all sources)

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
   - [Financial Modeling Prep ESG API](#38-financial-modeling-prep-fmp-esg-api)
4. [WSG-Check Differentiators](#4-wsg-check-differentiators)
5. [Gaps in WSG-Check Plan](#5-gaps-in-wsg-check-plan)
   - [Gap 1: No CO2 estimate](#gap-1-no-co2--carbon-footprint-estimate)
   - [Gap 2: No green hosting check — WSG 4.1 correction](#gap-2-no-green-hosting-check-wsg-41)
   - [Gap 3: No Core Web Vitals](#gap-3-no-performance-score--core-web-vitals-integration)
   - [Gap 4: Transfer vs. source sizes](#gap-4-transfer-sizes-vs-source-sizes)
   - [Gap 5: Dark mode OLED framing](#gap-5-dark-mode-as-an-energy-saving-feature)
   - [Gap 6: WSG 4.1 missing from matrix](#gap-6-wsg-41-sustainable-hosting-missing-from-coverage-matrix)
   - [Gap 7: WSG Section 5 entirely absent](#gap-7-wsg-section-5-business-strategy-entirely-uncovered)
   - [Gap 8: No PDF / document analysis](#gap-8-no-pdf--downloadable-document-analysis)
   - [Gap 9: Country-specific grid intensity](#gap-9-country-specific-grid-intensity)
   - [Gap 10: WSG 3.20 missing](#gap-10-wsg-320-database-query-complexity-missing)
   - [Gap 11: No corporate ESG context layer](#gap-11-no-corporate-esg-context-layer)
6. [Recommendations](#6-recommendations)
7. [Implementation Priority Summary](#7-implementation-priority-summary)

---

## 1. Tools Surveyed

| Tool                                                                                                | Type                | Free/Open         | Primary Metric                  | WSG Mapping |
| --------------------------------------------------------------------------------------------------- | ------------------- | ----------------- | ------------------------------- | ----------- |
| [EcoGrader](https://ecograder.com)                                                                  | Web app             | Free              | 0-100 score + CO2/page          | ❌          |
| [Digital Beacon](https://digitalbeacon.co)                                                          | Web app             | Free              | A+ – F grade + CO2/page         | ❌          |
| [Website Carbon Calculator](https://websitecarbon.com)                                              | Web app + API       | Free              | CO2g/page view                  | ❌          |
| [CO2.js](https://github.com/thegreenwebfoundation/co2.js)                                           | npm library         | Open (Apache-2.0) | bytes → CO2e                    | ❌          |
| [SquareEye Guide](https://squareeye.com/how-to-audit-and-optimise-your-website-for-sustainability/) | Manual audit guide  | Free (content)    | Manual checklist                | Partial     |
| [Sitespeed.io + Coach](https://www.sitespeed.io/)                                                   | CLI / Docker        | Open (MIT)        | Performance + sustainability    | ❌          |
| [GreenFrame](https://greenframe.io)                                                                 | SaaS monitoring     | Freemium          | Scenario energy (µWh)           | ❌          |
| [FMP ESG API](https://site.financialmodelingprep.com/developer/docs#esg)                           | Commercial REST API | Paid (freemium)   | Corporate E/S/G scores (0–100)  | ❌          |
| **WSG-Check** _(planned)_                                                                           | Web app + CLI + API | Open (planned)    | Per-guideline pass/fail + score | ✅ Full     |

---

## 2. Feature Comparison Matrix

| Feature                                          |  EcoGrader   | Digital Beacon | Website Carbon |    CO2.js    | Sitespeed.io |   WSG-Check (planned)    |
| ------------------------------------------------ | :----------: | :------------: | :------------: | :----------: | :----------: | :----------------------: |
| **Carbon/CO2 estimate per page**                 |      ✅      |       ✅       |       ✅       | ✅ (library) |      ✅      |       ✅ Phase 3.5       |
| **Green hosting check**                          |      ✅      |       ✅       |       ✅       |   ✅ (API)   |      ✅      |       ✅ Phase 3.5       |
| **Page weight / transfer size**                  |      ✅      |       ✅       |       ✅       |      —       |      ✅      |            ✅            |
| **Compression check (gzip/brotli)**              |      ❌      |       ✅       |       ❌       |      —       |      ✅      |            ✅            |
| **Image format check (WebP/AVIF)**               |      ✅      |       ✅       |       ❌       |      —       |      ✅      |            ✅            |
| **Lazy loading check**                           |      ✅      |       ✅       |       ❌       |      —       |      ✅      |            ✅            |
| **Cache headers analysis**                       |      ❌      |       ✅       |       ❌       |      —       |      ✅      |            ✅            |
| **Third-party script audit**                     |      ❌      |   ✅ (count)   |       ❌       |      —       |      ✅      |            ✅            |
| **Core Web Vitals / PageSpeed**                  | ✅ (via PSI) |       ❌       |       ❌       |      —       |      ✅      |      ❌ Not planned      |
| **Security headers check**                       |      ❌      |       ❌       |       ❌       |      —       |      ❌      |            ✅            |
| **Semantic HTML analysis**                       |      ❌      |       ❌       |       ❌       |      —       |      ❌      |            ✅            |
| **Preference media queries**                     |      ❌      |       ❌       |       ❌       |      —       |      ❌      |            ✅            |
| **Redirect chain analysis**                      |      ❌      |       ❌       |       ❌       |      —       |      ✅      |            ✅            |
| **`carbon.txt` / `robots.txt` / `security.txt`** |      ❌      |       ❌       |       ❌       |      —       |      ❌      |            ✅            |
| **Font optimization checks**                     |      ❌      |       ❌       |       ❌       |      —       |      ❌      |            ✅            |
| **ARIA / accessibility signals**                 |      ❌      |       ❌       |       ❌       |      —       |      ❌      |            ✅            |
| **Full W3C WSG guideline mapping**               |      ❌      |       ❌       |       ❌       |      —       |      ❌      |            ✅            |
| **CLI interface**                                |      ❌      |       ❌       |       ❌       |   ✅ (lib)   |      ✅      |            ✅            |
| **CI/CD integration**                            |      ❌      |       ❌       |       ❌       |   ✅ (lib)   |      ✅      |       ✅ (planned)       |
| **Multiple output formats**                      |      ❌      |       ❌       |    JSON API    |      —       |  JSON/HTML   | ✅ JSON/MD/HTML/terminal |
| **Multi-page crawling**                          |      ❌      |       ❌       |       ❌       |      —       |      ✅      |       ✅ (planned)       |
| **Country-level grid intensity**                 |      ❌      |       ❌       |       ❌       |      ✅      |      ❌      |      ❌ Not planned      |
| **Open source / self-hostable**                  |      ❌      |       ❌       |       ❌       |      ✅      |      ✅      |            ✅            |

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

**Methodology:** [Sustainable Web Design model](https://sustainablewebdesign.org/) — the same model that underpins CO2.js and Website Carbon Calculator. As of July 2025, Website Carbon (from the same team at Wholegrain Digital) moved to v4 of the SWD model; Digital Beacon is expected to follow.

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

**Version:** [Website Carbon V4](https://www.wholegraindigital.com/blog/updating-website-carbon-to-v4-of-the-sustainable-web-design-model/) launched July 2025, aligning with SWD model v4.

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
**Funding:** GitHub, Google Season of Docs, SIDN Fonds, Internet Society Foundation, RIPE NCC

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
import { co2, hosting } from '@tgwf/co2'

// Carbon estimate
const swd = new co2({ model: 'swd', version: 4 })
const grams = swd.perByte(pageWeightInBytes, isGreenHosted)

// Green hosting check (requires API call or offline dataset)
const isGreen = await hosting.check('example.com')
```

**Strengths:**

- Battle-tested, widely adopted (used by Digital Beacon, Sitespeed.io, WebPageTest, Firefox DevTools, and others)
- TypeScript types via `@types/tgwf__co2`
- ESM and CJS builds — fully compatible with this project's stack
- Green hosting check built in
- Country-specific emissions data
- Apache 2.0 license (compatible with any open-source license)
- Well-funded and actively maintained

**Limitations:**

- Does not map to WSG guidelines
- SWD methodology is an approximation; it estimates based on bytes transferred, not measured energy

**Relationship to WSG-Check:**  
CO2.js is integrated in **Phase 3.5** of WSG-Check. `@tgwf/co2` is a direct dependency; `estimateCO2()` uses the SWD v4 model and `checkGreenHosting()` queries the Green Web Foundation API. Both results are exposed as top-level fields in `RunResult` (`co2PerPageView`, `co2Model`, `isGreenHosted`).

---

### 3.5 SquareEye Sustainability Audit Guide

**URL:** https://squareeye.com/how-to-audit-and-optimise-your-website-for-sustainability/  
**Type:** Editorial / manual audit guide (not a tool)  
**Context:** Written for law firms and barristers' chambers; second in a three-part series on digital sustainability

**What it covers — a 6-step framework:**

**Step 1: Measure your website's carbon footprint**  
Establish a baseline using Website Carbon Calculator V4, EcoGrader, and Digital Beacon. Record results across representative page types (homepage, profile pages, document-heavy pages).

**Step 2: Review hosting and infrastructure**  
Use the [Green Web Foundation Checker](https://www.thegreenwebfoundation.org/green-web-check/) to verify renewable energy hosting. Ask hosting providers for PUE (Power Usage Effectiveness) scores, CDN usage, and energy policy documentation. For shared hosting and specialist CMS platforms, check energy policies with the provider directly.

**Step 3: Evaluate page weight and asset optimisation**  
The [HTTP Archive data](https://httparchive.org/reports/page-weight) shows average page weight has grown ~500% since 2010. Key areas:

- **Images** — WebP/AVIF formats, compression, lazy loading; profile photos cited as a common source of oversized files
- **Documents (PDFs)** — identified as the _single most significant emissions source_ on document-heavy sites (law firms, chambers with large publication libraries). Checks: compression, HTML alternatives for long-term content, deduplication. The guide recommends a standalone PDF audit as a dedicated exercise.
- **Video** — Adaptive streaming platforms (Vimeo, YouTube) over self-hosting; transcripts to reduce reliance on video stream; avoid autoplay

**Step 4: Audit code, scripts and integrations**

- **Analytics platforms** — Google Analytics 4 is more efficient than predecessors; additional platforms (Clarity, Hotjar, HubSpot) add weight on every page load
- **CRM integrations** — Check frequency and per-page necessity of integration scripts (Lex, Peppermint, Dynamics, LexisNexis, custom API endpoints)
- **Google Tag Manager** — Often accumulates outdated/orphaned tags; regular cleanup is a meaningful sustainability action and one no automated tool currently raises
- **Cookie banners** — Some consent tools load dozens of external resources; lighter alternatives exist

**Step 5: Review content structure and user journeys**  
Remove: outdated news, duplicate PDFs, old profiles, archived events, unused practice areas. Check: Does every page still serve a business purpose? Are user journeys efficient? Can content be consolidated (e.g., case updates grouped by practice area)?

**Step 6: Use monitoring tools and set improvement targets**  
Recommended ongoing tools: Google Lighthouse, WebPageTest, GTmetrix. Example targets: reduce average page weight by 20%, reduce third-party scripts by 30%, improve Website Carbon rating from "average" to "cleaner than 70% of sites tested."

**Content governance framework proposed:**

- Aged content policy (for events, news items, low-traffic pages)
- Content review cycles (to keep evergreen content accurate)
- Image upload policy (to prevent oversized uploads recurring)
- PDF usage policy (when to upload a PDF vs. create a webpage)
- PDF audit policy (eliminate duplication, assess necessity and compression)

**Strengths:**

- Holistic — covers organisational and content concerns that no automated tool can address
- Practical; actionable steps for non-engineers and content editors
- PDF library focus is a real-world blindspot for all automated tools
- Tag Manager audit is a concrete, actionable recommendation no competitor raises
- Dark/eco mode explicitly highlighted as an energy-saving feature for OLED screens (not just accessibility)
- Content governance policies create a sustainability framework beyond a one-time audit
- Links directly to established third-party tools for each audit area

**Limitations:**

- Manual process; no automation or repeatable checks
- Does not map to WSG guidelines
- Not integrable into CI/CD pipelines
- Legal-sector focus means some advice is domain-specific

**Relationship to WSG-Check:**  
The SquareEye guide confirms that WSG-Check's planned checks (images, fonts, JS deferral, caching, preference queries) are the right priorities. It highlights two important gaps not currently in the plan:

1. **PDF / downloadable document analysis** — directly maps to WSG 2.17 (see [Gap 8](#gap-8-no-pdf--downloadable-document-analysis))
2. **Tag Manager and analytics script governance** — partially covered by third-party script checks but deserves specific recommendations in report output

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

### 3.8 Financial Modeling Prep (FMP) ESG API

**URL:** https://site.financialmodelingprep.com/developer/docs#esg  
**Type:** Commercial REST API  
**Access:** Paid (freemium tier with daily request limits)

**What it does:**

The FMP ESG API provides **corporate-level Environmental, Social, and Governance (ESG) scores** for publicly-traded companies. Given a stock ticker symbol (e.g., `AAPL`, `MSFT`, `GOOG`), the API returns:

- `environmentalScore` — a 0–100 numeric score measuring the company's environmental footprint (carbon emissions, energy use, waste, water)
- `socialScore` — a 0–100 score measuring labour practices, supply-chain ethics, and community relations
- `governanceScore` — a 0–100 score measuring board oversight, executive pay, and transparency
- `ESGScore` — a combined weighted score
- `rating` — a letter-grade summary (e.g., AAA, AA, A, BBB, BB, B, CCC)
- Historical time-series data for trend analysis

The data is aggregated from regulatory filings, third-party ratings agencies, and company disclosures. Unlike web-page metrics, these are organisational-level signals that describe the company _operating_ the website, not the website itself.

**Strengths:**

- Machine-readable corporate ESG data via a REST API with JSON output
- Historical data enables trend tracking year-over-year
- Covers thousands of publicly-traded companies globally
- Well-documented; widely used in fintech and ESG reporting applications
- Could bridge the gap between web-level sustainability (WSG) and enterprise-level ESG reporting frameworks (GRI, SASB, TCFD)

**Limitations:**

- **Scope mismatch**: Data is limited to publicly-traded companies — most websites checked with WSG-Check are operated by SMEs, non-profits, or individuals with no stock ticker
- **Commercial dependency**: The free tier allows only ~250 API calls/day; meaningful production use requires a paid subscription (pricing starts at ~$19/month; enterprise tiers are significantly higher)
- **Methodology opacity**: ESG scores from different providers (FMP aggregates multiple agencies) frequently disagree by 30–50 points for the same company; users may find the scores confusing or misleading without proper caveats
- **Privacy / data sharing concern**: Querying FMP for company ESG data would require WSG-Check to infer or accept the user's company identity, which is out of scope for a URL-only tool
- **No WSG alignment**: FMP ESG scores measure corporate-level sustainability, not W3C Web Sustainability Guideline compliance; mixing them risks confusing two fundamentally different accountability frameworks
- **Latency**: Adding a second external API call (alongside the Green Web Foundation check) increases pipeline latency for every run

**Relationship to WSG-Check:**  
FMP ESG data operates at the _organisational_ level, while WSG-Check operates at the _technical implementation_ level. These are complementary, not competitive.

The most plausible integration point is **Phase 3 Regulatory Export** (identified in the Executive Summary), where WSG-Check could produce a combined ESG+WSG report for enterprises complying with frameworks such as EU CSRD or the SEC climate disclosure rules. However, this feature is niche: it depends on a commercial paid API and is relevant only to the subset of WSG-Check users whose organisations are publicly traded. It is therefore assessed as a **low-priority future enhancement**, not part of the core roadmap.

---

## 4. WSG-Check Differentiators

WSG-Check has a genuinely unique position in the ecosystem. No existing tool does all of the following:

1. **Full W3C WSG mapping** — WSG-Check is the only planned tool that checks every automatable guideline across WSG Sections 2, 3, 4, and 5 and links results back to specific WSG IDs (e.g., "3.12 — Preference media queries"). This is a clear, defensible differentiator.

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

### ~~Gap 1: No CO2 / Carbon Footprint Estimate~~ ✅ Resolved in Phase 3.5

Every major competitor surfaces an estimated grams of CO2 per page view as the headline metric. ~~WSG-Check relegates CO2.js integration to "Future Enhancements." This is a strategic mistake: **users expect a carbon number**. Without it, WSG-Check will feel incomplete compared to Digital Beacon or EcoGrader even when it provides far more guideline detail.~~

**Resolved:** `@tgwf/co2` was added as a dependency in Phase 3.5. `estimateCO2(bytes, isGreenHosted)` uses the Sustainable Web Design v4 model to compute `co2PerPageView` in grams from `pageWeight.htmlSize`. The value is exposed as a top-level field in `RunResult`.

### ~~Gap 2: No Green Hosting Check (WSG 4.1)~~ ✅ Partially Resolved in Phase 3.5

All four competitor tools check whether the target website is hosted on infrastructure verified to use renewable energy. ~~This check uses the [Green Web Foundation API](https://www.thegreenwebfoundation.org/tools/green-web-dataset/) (or the bundled offline dataset in CO2.js). It is the single most impactful sustainability factor for most websites, and its absence will be noticed.~~

> ⚠️ **Guideline correction:** The relevant WSG guideline is **4.1 "Use sustainable hosting"**, not 4.8 or 4.9. WSG 4.8 in the actual specification is "Back up critical data at routine intervals" — unrelated to hosting sustainability. WSG 4.9 is "Consider the impact and requirements of data processing." The IMPLEMENTATION_PLAN.md coverage matrix omits 4.1 entirely.

**Partially resolved:** `checkGreenHosting(domain)` in Phase 3.5 queries the Green Web Foundation API via CO2.js and exposes `isGreenHosted: boolean` as a top-level field in `RunResult`. A dedicated `CheckResult` for **WSG 4.1** (with a guideline ID, recommendation text, and score) remains to be added in **Phase 5 (Hosting Checks)**.

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

### Gap 6: WSG 4.1 (Sustainable Hosting) Missing from Coverage Matrix

The WSG-Check coverage matrix in `IMPLEMENTATION_PLAN.md` covers WSG 4.2 (caching), 4.3 (compression), 4.4 (error pages/redirects), and 4.10 (CDN), but **WSG 4.1 "Use sustainable hosting" is absent**. This is the most impactful hosting check and the one all competitors offer. It is directly automatable via the Green Web Foundation dataset.

**Effort to fix:** Low — add WSG 4.1 to Phase 5 coverage matrix and implement with CO2.js `hosting.check()`

### Gap 7: WSG Section 5 (Business Strategy) Entirely Uncovered

The W3C WSG specification has **four sections**, not three:

- Section 2: User Experience Design (21 guidelines)
- Section 3: Web Development (20 guidelines)
- Section 4: Hosting, Infrastructure, and Systems (12 guidelines)
- **Section 5: Business Strategy and Product Management (27 guidelines)** ← not mentioned in the plan

Section 5 includes guidelines such as:

- **5.4** Communicate the environmental impact of user choices
- **5.5** Calculate the environmental impact ← directly relevant to CO2 estimation
- **5.25** Define performance and environmental budgets ← directly relevant to WSG-Check's `failThreshold` feature
- **5.26** Use open source where possible ← WSG-Check itself fulfills this

Most Section 5 guidelines are `manual-only` (they require organizational policy, not code), but several (5.5, 5.25) are automatable as checks, and all of them should be present in the **Guidelines Reference page** (`/guidelines`) of the web app to give users a complete picture of the WSG spec.

**Effort to fix:** Medium — add all 27 Section 5 guidelines to the registry as `manual-only` entries; flag 5.5 and 5.25 as automation candidates for a future phase

### Gap 8: No PDF / Downloadable Document Analysis

The SquareEye guide identifies PDF libraries as the **single most significant emissions source** on document-heavy websites. The HTTP Archive reports average page weight grew ~500% since 2010, partly driven by document hosting. WSG-Check has no planned check for:

- Detecting large PDF or document downloads linked from the page
- Flagging documents above a size threshold for review
- Recommending document-to-HTML conversion for long-term content

The relevant WSG guideline **2.17 "Reduce the impact of downloadable and physical documents"** exists in the specification but is not listed in the WSG-Check coverage matrix.

**Relevant WSG guideline:** 2.17 — Reduce the impact of downloadable and physical documents  
**Effort to fix:** Medium — add link analysis for document MIME types; flag files above a configurable size threshold

### Gap 9: Country-Specific Grid Intensity

CO2.js includes per-country grid intensity data from Ember (annual averages) and the UNFCCC (marginal intensity). WSG-Check makes no use of this. A CO2 estimate that accounts for where a site's servers are located is more accurate than a global average. This is a "nice to have" but would make WSG-Check's carbon estimate more sophisticated than competitors.

**Effort to fix:** Medium — requires user input (country selection) or geo-detection; defer to a v2 feature

### Gap 10: WSG 3.20 (Database Query Complexity) Missing

The current WSG-Check coverage matrix lists guidelines up to 3.19 but omits **WSG 3.20 "Reduce the number and complexity of database queries"**. This guideline is `semi-automated` at best (requires server-side instrumentation), but it should appear in the guidelines registry. It could be partially addressed by detecting API response patterns or recommending database query analysis tools in the report.

**Effort to fix:** Low to document; medium to implement (likely `manual-only` or `semi-automated` tag in the registry for v1)

---

### Gap 11: No Corporate ESG Context Layer

WSG-Check checks the _technical_ sustainability of a website against W3C WSG guidelines, but it provides no information about the _organisational_ sustainability posture of the company behind the site. This creates a context gap for users in regulated industries or those preparing ESG disclosures: a technically green website could belong to an organisation with poor environmental practices, and vice versa.

The [FMP ESG API](https://site.financialmodelingprep.com/developer/docs#esg) could partially address this by enriching a WSG-Check report with the target company's Environmental, Social, and Governance scores (see Section 3.8). No existing competitor in this analysis surfaces corporate ESG context alongside technical web sustainability checks.

However, this gap is a **low-priority** item because:
1. FMP data covers only publicly-traded companies, which is a small fraction of WSG-Check's expected audience
2. The connection between corporate ESG scores and W3C WSG technical compliance is indirect and may confuse users
3. Adding a paid commercial API dependency conflicts with WSG-Check's open-source positioning

**Effort to fix:** High — requires user identity input (stock ticker or company name), FMP API key management, optional feature flag, and clear UX framing to avoid mixing corporate ESG with WSG technical scores  
**Recommended phase:** Post-launch v2 as an optional "ESG enrichment" module

---

## 6. Recommendations

The following recommendations are ordered by impact and ease of implementation. None of them require changing the overall architecture.

---

### ~~R1: Integrate CO2.js for Carbon Estimation~~ ✅ Implemented in Phase 3.5

**What:** ~~Add `@tgwf/co2` as a dependency. In Phase 3 (Core Module) or Phase 6 (Report Module), after `analyzePageWeight()` returns the total transfer size, pass that byte count through `co2.perByte()` using the Sustainable Web Design v4 model to produce a grams-of-CO2-per-page-view estimate. Expose it as a top-level field in `SustainabilityReport`.~~ **Done.** `@tgwf/co2` is a production dependency. `estimateCO2(htmlSize, isGreenHosted)` in `src/utils/carbon-estimator.ts` uses the SWD v4 model. `co2PerPageView` and `co2Model: 'swd-v4'` are top-level fields in `RunResult`.

**Why:** Every competitor shows a carbon number. Users expect it. CO2.js is:

- Apache 2.0 licensed
- ESM-native (compatible with this project's `"type": "module"`)
- Small (~15 KB)
- Already used by Digital Beacon, Sitespeed.io, WebPageTest, and Firefox DevTools
- Well-maintained by the Green Web Foundation (v0.18 switching to SWD v4 in Feb 2026)
- Funded by GitHub, Google Season of Docs, and others — low abandonment risk

---

### ~~R2: Add Green Hosting Check — WSG 4.1~~ ✅ Partially Implemented in Phase 3.5

**What:** ~~Use `hosting.check(domain)` from CO2.js to query the Green Web Foundation's dataset and determine whether the target site's primary domain is served from verified renewable-energy infrastructure. Expose the result as a dedicated check tied to **WSG 4.1 "Use sustainable hosting"**.~~

> ⚠️ **Correction from initial draft:** This check maps to **WSG 4.1**, not 4.8. WSG 4.8 in the current specification is "Back up critical data at routine intervals" — it has no relation to hosting sustainability. WSG 4.9 is "Consider the impact and requirements of data processing."

**Partially implemented:** `checkGreenHosting(domain)` in `src/utils/carbon-estimator.ts` calls `hosting.check(domain)` from CO2.js and exposes the result as `isGreenHosted: boolean` in `RunResult`. A dedicated **WSG 4.1 `CheckResult`** (with guideline ID, pass/fail scoring, and recommendation text) remains to be added in **Phase 5 (Hosting Checks)**:

**Remaining Phase 5 work — Add WSG 4.1 to the guidelines registry** with:

```
ID: 4.1
Title: Use sustainable hosting
Category: hosting
Machine-testable: true (Green Web Foundation dataset lookup — already available via isGreenHosted)
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

### R5: Fix WSG 4.1 in Coverage Matrix and Add Section 5 (Priority: **High**)

**What:** Update the WSG Guidelines Coverage Matrix in `IMPLEMENTATION_PLAN.md`:

1. Replace any erroneous reference to "WSG 4.8 (green hosting)" with the correct **WSG 4.1 "Use sustainable hosting"**
2. Add a Section 5 block to the coverage matrix, marking all 27 Business Strategy guidelines as `manual-only` in the guidelines registry, with **5.5** ("Calculate the environmental impact") and **5.25** ("Define performance and environmental budgets") flagged as candidates for automation

**Why:** WSG 4.1 omission is a straightforward coverage gap. Section 5 absence means the `/guidelines` reference page in the web app will be materially incomplete — users consulting WSG-Check as a reference tool will find it covers only ~60% of the full specification.

---

### R6: Add WSG 2.17 (Downloadable Documents) Check (Priority: **Medium**)

**What:** Implement a check for WSG 2.17 "Reduce the impact of downloadable and physical documents". At minimum: detect `<a href>` links pointing to PDFs or other large document formats (`.pdf`, `.docx`, `.pptx`, `.zip`), flag documents above a size threshold (e.g., 1 MB), and recommend compression and HTML alternatives.

**Why:** The SquareEye guide identifies PDF libraries as the **single most significant emissions source** on document-heavy sites. WSG 2.17 is already in the specification but is entirely missing from the Phase 5 coverage matrix. This check would be meaningfully differentiated from all existing competitors, none of which audit linked documents.

**Suggested phase:** Add to **Phase 5 (UX Checks, Section 2)**.

---

### R7: Disclose Static-Analysis Limitations in Report Output (Priority: **Low**)

**What:** Add a `methodology` section to the `SustainabilityReport` type that explains:

1. That analysis is performed via static HTML/HTTP analysis without a browser
2. That resource sizes are measured from source, not actual CDN-compressed transfer sizes
3. That JavaScript-rendered content is not evaluated
4. That CO2 estimates use the SWD v4 model and are approximations based on data transferred

**Why:** Digital Beacon and EcoGrader make the same trade-offs without disclosing them. WSG-Check's open-source transparency is a differentiator. Users who also use Sitespeed.io or GreenFrame will understand the complementary role.

---

### R8: Consider CO2.js Country-Specific Estimate as a v2 Feature (Priority: **Low**)

**What:** Offer an optional user input (or auto-detect from server IP location) to use country-specific average grid intensity from CO2.js's bundled Ember dataset, producing a more accurate CO2 estimate. Document this as a planned v2 feature.

**Why:** The global SWD average is a simplification. A UK-hosted site has markedly different grid intensity than a coal-heavy region. CO2.js already includes the data; it is a matter of exposing the option.

**Suggested phase:** v2 enhancement, not core roadmap.

---

### R9: Acknowledge Complementary Tools in Reports and Documentation (Priority: **Low**)

**What:** In the WSG-Check report output and documentation, recommend complementary tools for dimensions WSG-Check does not cover:

- **GreenFrame** — scenario-based energy monitoring for JS-heavy applications
- **Sitespeed.io** — performance-with-sustainability analysis using a real browser
- **Google PageSpeed Insights / Lighthouse** — Core Web Vitals and performance budgets
- **WebPageTest** — detailed waterfall analysis and carbon estimates

**Why:** WSG-Check occupies a distinct niche (WSG-aligned, static analysis, CI-friendly). Positioning it as part of an ecosystem rather than a replacement for all tools avoids overselling and builds community trust.

---

### R10: Evaluate FMP ESG API as an Optional v2 "ESG Enrichment" Module (Priority: **Low**)

**What:** Defer integration of the [FMP ESG API](https://site.financialmodelingprep.com/developer/docs#esg) to a post-launch v2 "ESG Enrichment" module. If implemented, it should be:

- **Opt-in only** — users supply a stock ticker symbol alongside the URL; the ESG lookup is never performed automatically
- **Clearly labelled** — displayed in a separate "Corporate ESG Context" section of the report, visually distinct from the W3C WSG technical score to prevent conflation
- **Feature-flagged** — disabled by default; enabled via a `--esg-ticker` CLI flag or a UI toggle, with the API key provided by the operator (not bundled in the open-source tool)
- **Gracefully degraded** — if the FMP API call fails or the ticker is unrecognised, the WSG report is returned without the ESG section; the check pipeline is never blocked

**Why this is low priority:**

| Factor | Assessment |
|--------|-----------|
| Audience overlap | FMP ESG data covers only publicly-traded companies; most WSG-Check users audit SME, non-profit, or personal sites that have no ticker symbol |
| Commercial dependency | FMP's production tiers start at ~$19/month; this conflicts with WSG-Check's open-source / self-hostable positioning — operators would bear the API cost |
| Methodology risk | ESG scores from different agencies diverge by 30–50 points for the same company; surfacing them without extensive methodology caveats risks misleading users |
| Scope inflation | Mixing corporate-level ESG with page-level W3C WSG compliance risks blurring WSG-Check's clear identity as a developer tool |
| Regulatory demand | The EU CSRD and SEC climate disclosure frameworks that would motivate this feature apply to large enterprises, not the typical WSG-Check user |

**Why it is still worth tracking:**

- The Executive Summary explicitly targets "Regulatory Export: Generating reports that satisfy emerging ESG reporting requirements" as a Phase 3 goal; FMP ESG is one concrete data source for that goal
- No competing web sustainability tool surfaces corporate ESG context — this would be a genuine differentiator for the enterprise segment
- If WSG-Check gains traction with enterprise customers subject to CSRD or TCFD reporting, demand for this feature will increase; the low-coupling opt-in design above ensures it can be added without breaking the core pipeline

**Suggested phase:** v2 post-launch enhancement. Document in `IMPLEMENTATION_PLAN.md` Future Enhancements section.

---

The following table summarises which recommendations should be folded into the existing implementation plan phases:

| Recommendation                                   | Phase                                        | Effort            | Impact                                  |
| ------------------------------------------------ | -------------------------------------------- | ----------------- | --------------------------------------- |
| ~~R1: CO2.js carbon estimation~~ ✅              | Phase 3.5 (done)                             | —                 | High — matches user expectations        |
| ~~R2: Green hosting check (WSG 4.1)~~ ✅ partial | Phase 3.5 (data done); Phase 5 (CheckResult) | —                 | High — all competitors have this        |
| R5: Fix WSG 4.1 in matrix; add Section 5         | Plan + registry                              | Low (0.5 day)     | High — correctness + completeness       |
| R6: WSG 2.17 document/PDF check                  | Phase 5                                      | Medium (1–2 days) | Medium — unique, high real-world impact |
| R3: OLED energy framing for dark mode            | Phase 4, WSG 3.12                            | Trivial           | Medium — improves recommendations       |
| R4: PageSpeed disclaimer + link                  | Phase 6                                      | Low               | Medium — manages expectations           |
| R7: Methodology disclosure                       | Phase 6                                      | Low               | Low — transparency                      |
| R8: Country-specific CO2 estimate                | v2                                           | Medium            | Low (future)                            |
| R9: Complementary tools references               | Docs / Phase 6                               | Trivial           | Low — ecosystem positioning             |
| R10: FMP ESG API optional enrichment module      | v2 post-launch                               | High              | Low (enterprise niche, paid API)        |

### Revised Phasing Impact

With R1 and R2 partially resolved, R5 and R6 remaining:

1. **Phase 1 (Config Module / Guidelines Registry):** Add all 27 Section 5 guidelines as `manual-only` entries. Flag WSG 5.5 and 5.25 as automation candidates. Correct WSG 4.1 label (was missing; "4.8" reference was an error).
2. **Phase 3.5 (Core Module — done):** `@tgwf/co2` added as a dependency; `co2PerPageView` computed from `pageWeight.htmlSize` bytes; `isGreenHosted` queried via the Green Web Foundation API. Both exposed in `RunResult`.
3. **Phase 5 (Hosting & UX Checks):** Add WSG 4.1 entry to guidelines registry; implement a dedicated `CheckResult` for sustainable hosting reusing the `isGreenHosted` value already in `RunResult`. Add WSG 2.17 linked-document size check.
4. **Phase 6 (Report Module):** Surface `co2PerPageView`, `isGreenHosted`, and a methodology disclaimer in the report output. Add PageSpeed Insights link in WSG 3.1/3.8 recommendations.

The R1/R2 work required **~1 day of effort** and closes the most visible perception gaps against every existing competitor.

---

_This document was produced as part of the WSG-Check project analysis after direct review of the W3C WSG specification and the listed tools. It is intended to inform the roadmap; implementation decisions rest with the project maintainer._
