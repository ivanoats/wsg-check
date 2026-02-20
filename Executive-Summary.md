The wsg-check tool is a specialized utility designed to bridge the gap between high-level sustainability principles and technical implementation. By focusing specifically on the W3C Web Sustainability Guidelines (WSG), it occupies a unique "compliance-as-code" niche.
## 1. Tool Purpose: The "Sustainability Linter"
The primary function of wsg-check is to automate the auditing of digital products against the Sustainability Progress, Principles, and Prosperity (PPP) model.
 * Automated Auditing: It scans web resources to identify "non-essential" assets (decorative design, heavy scripts, or inefficient paths) that contribute to excessive energy consumption.
 * Success Criteria Mapping: It maps technical findings directly to WSG Success Criteria (e.g., SC 2.1: Environmental Factors, SC 3.1: Efficient Paths).
 * Developer Feedback: Instead of just providing a high-level "green score," it provides actionable feedback at the code level, much like a linter (e.g., ESLint) but for environmental impact.
## 2. Implementation Plan: The Roadmap to 1.0
Based on the current trajectory of the W3C guidelines (which are moving toward "Note" status in mid-2026), the high-level roadmap for a tool like this typically follows these phases. This conceptual roadmap complements (but does not override) the more granular IMPLEMENTATION_PLAN.md, which currently scopes headless browser integration as a post-launch enhancement.

Phase 1: Core Engine (Current State)
 * Data Models: Defining TypeScript interfaces that mirror the WSG 1.0 specification.
 * Rule Engine: Building the logic that translates a specific guideline (e.g., "remove unnecessary assets") into a technical test (e.g., "check for unused CSS or oversized images").
 * Current Scanning: Using lightweight HTML parsing (e.g., via Cheerio-based scanners) to inspect static and fetched content.

Phase 2: Integration & Connectivity (The "Adapters")
 * Scanner Integration (post-launch enhancement): Future connection of the core to headless browsers (like Playwright or Puppeteer) to analyze real-time DOM states, building on top of the existing Cheerio-based scanning approach.
 * CI/CD Hooks: Developing GitHub Actions or GitLab runners so developers can break a build if a sustainability "budget" is exceeded.

Phase 3: Reporting & Compliance
 * Impact API: Integrating with the W3C Measurability Task Force's scoring consensus (slated for late 2026) to provide verified carbon estimates.
 * Regulatory Export: Generating reports that satisfy emerging ESG (Environmental, Social, and Governance) reporting requirements.

## 3. Marketplace Positioning
The market for "Green IT" tools is currently fragmented, placing wsg-check in a strategic spot:
| Category | Competitors | wsg-check Position |
|---|---|---|
| Broad Performance | Lighthouse, PageSpeed | Lighthouse measures speed (which correlates to carbon), but wsg-check measures intent and guideline compliance. |
| Carbon Estimators | Website Carbon, EcoGrader | These provide a "score" but no "fix." wsg-check is a developer tool meant for the workflow, not just a marketing badge. |
| Accessibility Tools | axe-core, WAVE | wsg-check is the green equivalent of axe-core. It targets the same "shift-left" philosophy where quality is checked during development. |

### The Competitive Edge
By being W3C-native, this tool avoids the "black box" problem of many commercial sustainability calculators. It provides a transparent, standardized way for organizations to prove they are following official industry guidelines, making it a "source of truth" rather than just a guesstimate tool.
