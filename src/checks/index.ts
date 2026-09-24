/**
 * Checks module – Phase 4.1, Phase 4.2, Phase 4.3, Phase 4.4, Phase 5.1 & Phase 5.2
 *
 * Exports all automated check functions that correspond to WSG web-development
 * guidelines (Phases 4.1–4.4, Phase 5.1, and Phase 5.2 of the implementation plan).
 *
 * Each check is a pure `CheckFn` — a function that accepts a `PageData`
 * bundle and returns a `CheckResult` (or a `Promise<CheckResult>`).  Checks
 * never throw; errors are caught by the `CheckRunner`.
 *
 * Usage:
 * ```ts
 * import { WsgChecker } from '@/core'
 * import { performanceChecks, semanticChecks, sustainabilityChecks, securityChecks, uxDesignChecks, hostingChecks } from '@/checks'
 *
 * const checker = new WsgChecker({}, [...performanceChecks, ...semanticChecks, ...sustainabilityChecks, ...securityChecks, ...uxDesignChecks, ...hostingChecks])
 * const result  = await checker.check('https://example.com')
 * ```
 */

// ─── Phase 4.1 — Performance & Efficiency ────────────────────────────────────
export { checkMinification } from './minification'
export { checkRenderBlocking } from './render-blocking'
export { checkPageWeight } from './page-weight'

// ─── Phase 4.2 — Semantic & Standards ────────────────────────────────────────
export { checkSemanticHtml } from './semantic-html'
export { checkAccessibilityAids } from './accessibility-aids'
export { checkFormValidation } from './form-validation'
export { checkMetadata, checkStructuredData } from './metadata'

// ─── Phase 4.3 — Sustainability-Specific ─────────────────────────────────────
export { checkCssRedundancy } from './redundancy'
export { checkThirdParty } from './third-party'
export { checkPreferenceMediaQueries } from './preference-media-queries'
export { checkResponsiveDesign } from './responsive-design'
export { checkSustainableJs } from './sustainable-js'

// ─── Phase 4.4 — Security & Maintenance ──────────────────────────────────────
export { checkSecurityHeaders } from './security-headers'
export { checkDependencyCount } from './dependency-count'
export { checkExpectedFiles, checkBeneficialFiles } from './expected-files'
export { checkHtmlVersion } from './html-version'

// ─── Phase 5.1 — UX Design (Section 2) ───────────────────────────────────────
export { checkNonEssentialContent } from './non-essential-content'
export { checkNavigationStructure } from './navigation-structure'
export { checkDeceptivePatterns } from './deceptive-patterns'
export { checkOptimizedMedia } from './optimized-media'
export { checkLazyLoading } from './lazy-loading'
export { checkAnimationControl } from './animation-control'
export { checkWebTypography } from './web-typography'
export { checkAltText } from './alt-text'
export { checkFontStackFallbacks } from './font-stack-fallbacks'
export { checkMinimalForms } from './minimal-forms'
export { checkDownloadableDocuments } from './downloadable-documents'

// ─── Phase 5.2 — Hosting & Infrastructure (Section 4) ────────────────────────
export { checkSustainableHosting } from './sustainable-hosting'
export { checkCaching } from './caching'
export { checkOfflineAccess } from './offline-access'
export { checkCompression } from './compression'
export { checkErrorPages } from './error-pages'
export { checkRedirects } from './redirects'
export { checkCdnUsage } from './cdn-usage'
export { checkDataRefresh } from './data-refresh'

import { checkMinification } from './minification'
import { checkRenderBlocking } from './render-blocking'
import { checkPageWeight } from './page-weight'
import { checkSemanticHtml } from './semantic-html'
import { checkAccessibilityAids } from './accessibility-aids'
import { checkFormValidation } from './form-validation'
import { checkMetadata, checkStructuredData } from './metadata'
import { checkCssRedundancy } from './redundancy'
import { checkThirdParty } from './third-party'
import { checkPreferenceMediaQueries } from './preference-media-queries'
import { checkResponsiveDesign } from './responsive-design'
import { checkSustainableJs } from './sustainable-js'
import { checkSecurityHeaders } from './security-headers'
import { checkDependencyCount } from './dependency-count'
import { checkExpectedFiles, checkBeneficialFiles } from './expected-files'
import { checkHtmlVersion } from './html-version'
import { checkNonEssentialContent } from './non-essential-content'
import { checkNavigationStructure } from './navigation-structure'
import { checkDeceptivePatterns } from './deceptive-patterns'
import { checkOptimizedMedia } from './optimized-media'
import { checkLazyLoading } from './lazy-loading'
import { checkAnimationControl } from './animation-control'
import { checkWebTypography } from './web-typography'
import { checkAltText } from './alt-text'
import { checkFontStackFallbacks } from './font-stack-fallbacks'
import { checkMinimalForms } from './minimal-forms'
import { checkDownloadableDocuments } from './downloadable-documents'
import { checkSustainableHosting } from './sustainable-hosting'
import { checkCaching } from './caching'
import { checkOfflineAccess } from './offline-access'
import { checkCompression } from './compression'
import { checkErrorPages } from './error-pages'
import { checkRedirects } from './redirects'
import { checkCdnUsage } from './cdn-usage'
import { checkDataRefresh } from './data-refresh'
import type { CheckFn, CheckFnWithId, PageData } from '../core/types'

/**
 * Wraps a check function in a new function with its guideline identity
 * attached, producing a `CheckFnWithId`: the legacy numeric `guidelineId`
 * the check reports under, and the `guidelineSlug` of the guideline it
 * implements in the targeted WSG release (`null` when the spec no longer has
 * one). The slug is declared per check because some legacy IDs are shared by
 * checks for different guidelines (e.g. alt text and downloadable documents
 * both report `2.17`).
 *
 * A new wrapper function is created for each call so that the original `fn`
 * is never mutated (avoids the no-param-reassign anti-pattern).
 */
const withGuidelineId = (
  fn: CheckFn,
  guidelineId: string,
  guidelineSlug: string | null
): CheckFnWithId => {
  const wrapped = (page: PageData): ReturnType<CheckFn> => fn(page)
  return Object.assign(wrapped, { guidelineId, guidelineSlug })
}

/**
 * All Phase 4.1 Performance & Efficiency checks bundled for convenience.
 *
 * | Check                | WSG Guideline | Testability |
 * | -------------------- | ------------- | ----------- |
 * | `checkMinification`  | 3.3           | automated   |
 * | `checkRenderBlocking`| 3.8           | automated   |
 * | `checkPageWeight`    | 3.1           | automated   |
 */
export const performanceChecks: ReadonlyArray<CheckFnWithId> = [
  withGuidelineId(checkMinification, '3.3', 'minify-and-remove-unused-code'),
  withGuidelineId(checkRenderBlocking, '3.8', 'defer-the-loading-of-non-critical-resources'),
  withGuidelineId(checkPageWeight, '3.1', 'set-goals-based-on-performance-and-energy-impact'),
]

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
export const semanticChecks: ReadonlyArray<CheckFnWithId> = [
  withGuidelineId(checkSemanticHtml, '3.7', 'ensure-code-follows-good-semantic-practices'),
  withGuidelineId(checkAccessibilityAids, '3.9', 'design-efficient-and-streamlined-user-journeys'),
  withGuidelineId(checkFormValidation, '3.10', null),
  withGuidelineId(checkMetadata, '3.4', 'structure-metadata-for-machine-readability'),
  withGuidelineId(checkStructuredData, '3.11', 'structure-metadata-for-machine-readability'),
]

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
export const sustainabilityChecks: ReadonlyArray<CheckFnWithId> = [
  withGuidelineId(checkCssRedundancy, '3.5', 'avoid-redundancy-and-duplication-in-code'),
  withGuidelineId(checkThirdParty, '3.6', 'treat-third-parties-the-same-as-first-parties'),
  withGuidelineId(
    checkPreferenceMediaQueries,
    '3.12',
    'use-media-queries-that-support-sustainability-goals'
  ),
  withGuidelineId(
    checkResponsiveDesign,
    '3.13',
    'ensure-layouts-work-for-different-devices-and-requirements'
  ),
  withGuidelineId(checkSustainableJs, '3.14', 'use-sustainable-javascript-and-apis'),
]

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
 *
 * `checkExpectedFiles` and `checkBeneficialFiles` both implement different
 * aspects of WSG 3.17 (required files vs. beneficial optional files).
 */
export const securityChecks: ReadonlyArray<CheckFnWithId> = [
  withGuidelineId(checkSecurityHeaders, '3.15', null),
  withGuidelineId(checkDependencyCount, '3.16', 'use-dependencies-sparingly-and-maintain-them'),
  withGuidelineId(checkExpectedFiles, '3.17', 'include-expected-and-beneficial-files'),
  withGuidelineId(checkBeneficialFiles, '3.17', 'include-expected-and-beneficial-files'),
  withGuidelineId(checkHtmlVersion, '3.19', 'use-the-latest-stable-language-version'),
]

/**
 * All Phase 5.1 UX Design checks bundled for convenience.
 *
 * | Check                        | WSG Guideline | Testability     |
 * | ---------------------------- | ------------- | --------------- |
 * | `checkNonEssentialContent`   | 2.9           | automated       |
 * | `checkNavigationStructure`   | 2.8           | automated       |
 * | `checkDeceptivePatterns`     | 2.10          | automated       |
 * | `checkOptimizedMedia`        | 2.7           | automated       |
 * | `checkLazyLoading`           | 2.11          | automated       |
 * | `checkAnimationControl`      | 2.15          | automated       |
 * | `checkWebTypography`         | 2.16          | automated       |
 * | `checkAltText`               | 2.17          | automated       |
 * | `checkFontStackFallbacks`    | 2.16          | automated       |
 * | `checkMinimalForms`          | 2.19          | automated       |
 * | `checkDownloadableDocuments` | 2.17          | semi-automated  |
 *
 * `checkWebTypography` and `checkFontStackFallbacks` both implement WSG 2.16
 * (typography-related aspects of sustainable design).
 * `checkAltText` and `checkDownloadableDocuments` both implement WSG 2.17
 * (providing text alternatives to non-text content).
 */
export const uxDesignChecks: ReadonlyArray<CheckFnWithId> = [
  withGuidelineId(checkNonEssentialContent, '2.9', 'design-to-assist-and-not-to-distract'),
  withGuidelineId(
    checkNavigationStructure,
    '2.8',
    'design-efficient-and-streamlined-user-journeys'
  ),
  withGuidelineId(checkDeceptivePatterns, '2.10', 'avoid-being-manipulative-or-deceptive'),
  withGuidelineId(checkOptimizedMedia, '2.7', 'optimize-media-to-reduce-resource-use'),
  withGuidelineId(checkLazyLoading, '2.11', 'optimize-media-to-reduce-resource-use'),
  withGuidelineId(
    checkAnimationControl,
    '2.15',
    'ensure-animation-is-proportionate-and-easy-to-control'
  ),
  withGuidelineId(checkWebTypography, '2.16', 'use-optimized-web-typography'),
  withGuidelineId(checkAltText, '2.17', null),
  withGuidelineId(checkFontStackFallbacks, '2.16', 'use-optimized-web-typography'),
  withGuidelineId(checkMinimalForms, '2.19', null),
  withGuidelineId(
    checkDownloadableDocuments,
    '2.17',
    'reduce-the-impact-of-downloadable-and-physical-documents'
  ),
]

/**
 * All Phase 5.2 Hosting & Infrastructure checks bundled for convenience.
 *
 * | Check                      | WSG Guideline | Testability     |
 * | -------------------------- | ------------- | --------------- |
 * | `checkSustainableHosting`  | 4.1           | automated       |
 * | `checkCaching`             | 4.2           | automated       |
 * | `checkOfflineAccess`       | 4.2           | automated       |
 * | `checkCompression`         | 4.3           | automated       |
 * | `checkErrorPages`          | 4.4           | semi-automated  |
 * | `checkRedirects`           | 4.4           | automated       |
 * | `checkCdnUsage`            | 4.10          | automated       |
 * | `checkDataRefresh`         | 4.7           | automated       |
 *
 * `checkCaching` and `checkOfflineAccess` both implement WSG 4.2
 * (caching/offline strategies — two separate aspects of the same guideline).
 * `checkErrorPages` and `checkRedirects` both implement WSG 4.4
 * (error handling and redirect hygiene).
 */
export const hostingChecks: ReadonlyArray<CheckFnWithId> = [
  withGuidelineId(checkSustainableHosting, '4.1', 'use-sustainable-hosting'),
  withGuidelineId(checkCaching, '4.2', 'optimize-caching-and-support-offline-access'),
  withGuidelineId(checkOfflineAccess, '4.2', 'optimize-caching-and-support-offline-access'),
  withGuidelineId(checkCompression, '4.3', 'reduce-data-transfer-with-compression'),
  withGuidelineId(checkErrorPages, '4.4', 'setup-necessary-error-pages-and-redirection-links'),
  withGuidelineId(checkRedirects, '4.4', 'setup-necessary-error-pages-and-redirection-links'),
  withGuidelineId(checkCdnUsage, '4.10', 'use-content-delivery-networks-cdns-when-beneficial'),
  withGuidelineId(checkDataRefresh, '4.7', 'define-the-frequency-of-data-refreshes'),
]
