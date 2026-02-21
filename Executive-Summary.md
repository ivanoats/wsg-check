The wsg-check tool is a specialized utility designed to bridge the gap between high-level sustainability principles and technical implementation. By focusing specifically on the W3C Web Sustainability Guidelines (WSG), it occupies a unique "compliance-as-code" niche. It helps encourage integration of the Sustainability Progress, Principles, and Prosperity (PPP) model into code for the web.

## 1. Tool Purpose: The "Sustainability Linter"

The primary function of wsg-check is to automate the auditing of digital products against the W3C Web Sustainability Guidelines (WSG).

- Automated Auditing: It scans web resources to identify "non-essential" assets (decorative design, heavy scripts, or inefficient paths) that contribute to excessive energy consumption.
- Success Criteria Mapping: It maps technical findings directly to WSG Success Criteria (e.g., SC 2.1: Undertake Systemic Impacts Mapping, SC 3.1: Identify Redundant Functionality).
- Developer Feedback: Instead of just providing a high-level "green score," it provides actionable feedback at the code level, much like a linter (e.g., ESLint) but for environmental impact.

## 2. Implementation Plan: The Roadmap to 1.0

Based on the current trajectory of the W3C guidelines (which are moving toward "Note" status in mid-2026), the high-level roadmap for a tool like this typically follows these phases. This conceptual roadmap complements (but does not override) the more granular IMPLEMENTATION_PLAN.md, which currently scopes headless browser integration as a post-launch enhancement.

### Phase 1: Core Engine (Current State)

- Data Models: Defining TypeScript interfaces that mirror the WSG 1.0 specification.
- Rule Engine: Building the logic that translates a specific guideline (e.g., "remove unnecessary assets") into a technical test (e.g., "check for unused CSS or oversized images").
- Current Scanning: Using lightweight HTML parsing (e.g., via Cheerio-based scanners) to inspect static and fetched content. Carbon estimation via `@tgwf/co2` (Sustainable Web Design v4 model) and green hosting status via the Green Web Foundation API are computed as part of the core pipeline and exposed in `RunResult` (`co2PerPageView`, `co2Model`, `isGreenHosted`).

### Phase 2: Integration & Connectivity (The "Adapters")

- Scanner Integration (post-launch enhancement): Future connection of the core to headless browsers (like Playwright or Puppeteer) to analyze real-time DOM states, building on top of the existing Cheerio-based scanning approach.
- CI/CD Hooks: Developing GitHub Actions or GitLab runners so developers can break a build if a sustainability "budget" is exceeded.

### Phase 3: Reporting & Compliance

- Impact API: Integrating with the W3C Measurability Task Force's scoring consensus (slated for late 2026) to provide verified carbon estimates.
- Regulatory Export: Generating reports that satisfy emerging ESG (Environmental, Social, and Governance) reporting requirements. The [FMP ESG API](https://site.financialmodelingprep.com/developer/docs#esg) has been evaluated as one potential data source for this goal: it provides corporate-level Environmental, Social, and Governance scores (0–100) and letter-grade ratings for publicly-traded companies. Analysis in `COMPETITIVE_ANALYSIS.md` (Section 3.8, Gap 11, and Recommendation R10) concludes that FMP integration is best deferred to a post-launch v2 opt-in module — its coverage is limited to publicly-traded companies, it introduces a paid commercial API dependency, and mixing corporate ESG scores with W3C WSG technical checks requires careful UX framing to avoid conflating two distinct accountability frameworks.

## 3. Marketplace Positioning

The market for "Green IT" tools is currently fragmented, placing wsg-check in a strategic spot:
| Category | Competitors | wsg-check Position |
|---|---|---|
| Broad Performance | Lighthouse, PageSpeed | Lighthouse measures speed (which correlates to carbon), but wsg-check measures intent and guideline compliance. |
| Carbon Estimators | Website Carbon, EcoGrader | These provide a "score" but no "fix." wsg-check is a developer tool meant for the workflow, not just a marketing badge. Unlike these tools, wsg-check now bundles its own CO2 estimate (via `@tgwf/co2` SWD v4) and green hosting check directly in the pipeline. |
| Accessibility Tools | axe-core, WAVE | wsg-check is the green equivalent of axe-core. It targets the same "shift-left" philosophy where quality is checked during development. |

### The Competitive Edge

By being W3C-native, this tool avoids the "black box" problem of many commercial sustainability calculators. It provides a transparent, standardized way for organizations to prove they are following official industry guidelines, making it a "source of truth" rather than just a guesstimate tool.
