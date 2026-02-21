/**
 * Checks module – Phase 4.1 & Phase 4.2
 *
 * Exports all automated check functions that correspond to WSG web-development
 * guidelines (Phases 4.1 and 4.2 of the implementation plan).
 *
 * Each check is a pure `CheckFn` — a function that accepts a `PageData`
 * bundle and returns a `CheckResult` (or a `Promise<CheckResult>`).  Checks
 * never throw; errors are caught by the `CheckRunner`.
 *
 * Usage:
 * ```ts
 * import { WsgChecker } from '@/core'
 * import { performanceChecks, semanticChecks } from '@/checks'
 *
 * const checker = new WsgChecker({}, [...performanceChecks, ...semanticChecks])
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

import { checkMinification } from './minification.js'
import { checkRenderBlocking } from './render-blocking.js'
import { checkPageWeight } from './page-weight.js'
import { checkSemanticHtml } from './semantic-html.js'
import { checkAccessibilityAids } from './accessibility-aids.js'
import { checkFormValidation } from './form-validation.js'
import { checkMetadata, checkStructuredData } from './metadata.js'

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
 * | `checkSemanticHtml`    | 3.8           | automated       |
 * | `checkAccessibilityAids` | 3.10        | automated       |
 * | `checkFormValidation`  | 3.12          | semi-automated  |
 * | `checkMetadata`        | 3.4           | automated       |
 * | `checkStructuredData`  | 3.13          | automated       |
 */
export const semanticChecks = [
  checkSemanticHtml,
  checkAccessibilityAids,
  checkFormValidation,
  checkMetadata,
  checkStructuredData,
] as const
