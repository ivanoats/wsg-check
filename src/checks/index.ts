/**
 * Checks module – Phase 4.1, Phase 4.2, Phase 4.3 & Phase 4.4
 *
 * Exports all automated check functions that correspond to WSG web-development
 * guidelines (Phases 4.1–4.4 of the implementation plan).
 *
 * Each check is a pure `CheckFn` — a function that accepts a `PageData`
 * bundle and returns a `CheckResult` (or a `Promise<CheckResult>`).  Checks
 * never throw; errors are caught by the `CheckRunner`.
 *
 * Usage:
 * ```ts
 * import { WsgChecker } from '@/core'
 * import { performanceChecks, semanticChecks, sustainabilityChecks, securityChecks } from '@/checks'
 *
 * const checker = new WsgChecker({}, [...performanceChecks, ...semanticChecks, ...sustainabilityChecks, ...securityChecks])
 * const result  = await checker.check('https://example.com')
 * ```
 */

// ─── Phase 4.1 — Performance & Efficiency ────────────────────────────────────
export { checkMinification } from './minification.js'
export { checkRenderBlocking } from './render-blocking.js'
export { checkPageWeight } from './page-weight.js'

// ─── Phase 4.2 — Semantic & Standards ────────────────────────────────────────
export { checkSemanticHtml } from './semantic-html.js'
export { checkAccessibilityAids } from './accessibility-aids.js'
export { checkFormValidation } from './form-validation.js'
export { checkMetadata, checkStructuredData } from './metadata.js'

// ─── Phase 4.3 — Sustainability-Specific ─────────────────────────────────────
export { checkCssRedundancy } from './redundancy.js'
export { checkThirdParty } from './third-party.js'
export { checkPreferenceMediaQueries } from './preference-media-queries.js'
export { checkResponsiveDesign } from './responsive-design.js'
export { checkSustainableJs } from './sustainable-js.js'

// ─── Phase 4.4 — Security & Maintenance ──────────────────────────────────────
export { checkSecurityHeaders } from './security-headers.js'
export { checkDependencyCount } from './dependency-count.js'
export { checkExpectedFiles, checkBeneficialFiles } from './expected-files.js'
export { checkHtmlVersion } from './html-version.js'

import { checkMinification } from './minification.js'
import { checkRenderBlocking } from './render-blocking.js'
import { checkPageWeight } from './page-weight.js'
import { checkSemanticHtml } from './semantic-html.js'
import { checkAccessibilityAids } from './accessibility-aids.js'
import { checkFormValidation } from './form-validation.js'
import { checkMetadata, checkStructuredData } from './metadata.js'
import { checkCssRedundancy } from './redundancy.js'
import { checkThirdParty } from './third-party.js'
import { checkPreferenceMediaQueries } from './preference-media-queries.js'
import { checkResponsiveDesign } from './responsive-design.js'
import { checkSustainableJs } from './sustainable-js.js'
import { checkSecurityHeaders } from './security-headers.js'
import { checkDependencyCount } from './dependency-count.js'
import { checkExpectedFiles, checkBeneficialFiles } from './expected-files.js'
import { checkHtmlVersion } from './html-version.js'

/**
 * All Phase 4.1 Performance & Efficiency checks bundled for convenience.
 *
 * | Check                | WSG Guideline | Testability |
 * | -------------------- | ------------- | ----------- |
 * | `checkMinification`  | 3.3           | automated   |
 * | `checkRenderBlocking`| 3.9           | automated   |
 * | `checkPageWeight`    | 3.1           | automated   |
 */
export const performanceChecks = [checkMinification, checkRenderBlocking, checkPageWeight] as const

/**
 * All Phase 4.2 Semantic & Standards checks bundled for convenience.
 *
 * | Check                  | WSG Guideline | Testability     |
 * | ---------------------- | ------------- | --------------- |
 * | `checkSemanticHtml`    | 3.7           | automated       |
 * | `checkAccessibilityAids` | 3.9         | automated       |
 * | `checkFormValidation`  | 3.10          | semi-automated  |
 * | `checkMetadata`        | 3.4           | automated       |
 * | `checkStructuredData`  | 3.11          | automated       |
 */
export const semanticChecks = [
  checkSemanticHtml,
  checkAccessibilityAids,
  checkFormValidation,
  checkMetadata,
  checkStructuredData,
] as const

/**
 * All Phase 4.3 Sustainability-Specific checks bundled for convenience.
 *
 * | Check                        | WSG Guideline | Testability |
 * | ---------------------------- | ------------- | ----------- |
 * | `checkCssRedundancy`         | 3.5           | automated   |
 * | `checkThirdParty`            | 3.6           | automated   |
 * | `checkPreferenceMediaQueries`| 3.12          | automated   |
 * | `checkResponsiveDesign`      | 3.13          | automated   |
 * | `checkSustainableJs`         | 3.14          | automated   |
 */
export const sustainabilityChecks = [
  checkCssRedundancy,
  checkThirdParty,
  checkPreferenceMediaQueries,
  checkResponsiveDesign,
  checkSustainableJs,
] as const

/**
 * All Phase 4.4 Security & Maintenance checks bundled for convenience.
 *
 * | Check                   | WSG Guideline | Testability |
 * | ----------------------- | ------------- | ----------- |
 * | `checkSecurityHeaders`  | 3.15          | automated   |
 * | `checkDependencyCount`  | 3.16          | automated   |
 * | `checkExpectedFiles`    | 3.17          | automated   |
 * | `checkBeneficialFiles`  | 3.17          | automated   |
 * | `checkHtmlVersion`      | 3.19          | automated   |
 */
export const securityChecks = [
  checkSecurityHeaders,
  checkDependencyCount,
  checkExpectedFiles,
  checkBeneficialFiles,
  checkHtmlVersion,
] as const
