/**
 * Checks module – Phase 4.1: Performance & Efficiency
 *
 * Exports all automated check functions that correspond to the WSG
 * Performance & Efficiency guidelines (Phase 4.1 of the implementation plan).
 *
 * Each check is a pure `CheckFn` — a function that accepts a `PageData`
 * bundle and returns a `CheckResult` (or a `Promise<CheckResult>`).  Checks
 * never throw; errors are caught by the `CheckRunner`.
 *
 * Usage:
 * ```ts
 * import { WsgChecker } from '@/core'
 * import { performanceChecks } from '@/checks'
 *
 * const checker = new WsgChecker({}, performanceChecks)
 * const result  = await checker.check('https://example.com')
 * ```
 */

export { checkMinification } from './minification.js'
export { checkRenderBlocking } from './render-blocking.js'

import { checkMinification } from './minification.js'
import { checkRenderBlocking } from './render-blocking.js'

/**
 * All Phase 4.1 Performance & Efficiency checks bundled for convenience.
 *
 * | Check                | WSG Guideline | Testability |
 * | -------------------- | ------------- | ----------- |
 * | `checkMinification`  | 3.3           | automated   |
 * | `checkRenderBlocking`| 3.9           | automated   |
 */
export const performanceChecks = [checkMinification, checkRenderBlocking] as const
