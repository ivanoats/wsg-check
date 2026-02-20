/**
 * Check runner for wsg-check.
 *
 * Executes all registered check functions against a `PageData` object,
 * running them in parallel via `Promise.allSettled`.  Individual check
 * failures are caught and recorded as `'fail'` results so that the remaining
 * checks can always complete — graceful degradation as specified in Phase 3.
 */

import { CheckError } from '../utils/errors.js'
import type { CheckFn, CheckResult, PageData } from './types.js'

// ─── CheckRunner ──────────────────────────────────────────────────────────────

/**
 * Collects check functions and executes them against page data.
 *
 * Typical usage:
 * ```ts
 * const runner = new CheckRunner()
 * runner.registerAll([checkMinifiedCode, checkMetadata])
 * const results = await runner.run(pageData)
 * ```
 */
export class CheckRunner {
  private readonly checks: CheckFn[] = []

  /**
   * Register a single check function.
   * Returns `this` for fluent chaining.
   */
  register(check: CheckFn): this {
    this.checks.push(check)
    return this
  }

  /**
   * Register an array of check functions at once.
   * Returns `this` for fluent chaining.
   */
  registerAll(checks: CheckFn[]): this {
    for (const check of checks) {
      this.checks.push(check)
    }
    return this
  }

  /**
   * Execute all registered checks against `page` in parallel.
   *
   * Any check that rejects or throws is caught; its rejection reason is
   * converted to a `'fail'` `CheckResult` so that the rest of the run is
   * unaffected.
   *
   * @returns An array of `CheckResult` objects in registration order.
   */
  async run(page: PageData): Promise<CheckResult[]> {
    // Wrap each check in a microtask so that synchronous throws are also
    // captured as rejections by Promise.allSettled.
    const settled = await Promise.allSettled(
      this.checks.map((check) => Promise.resolve().then(() => check(page)))
    )

    return settled.map((outcome, i): CheckResult => {
      if (outcome.status === 'fulfilled') {
        return outcome.value
      }

      // Convert the rejection into a typed failure result.
      const reason = outcome.reason as unknown
      const guidelineId =
        reason instanceof CheckError ? reason.guidelineId : `check-error-${String(i)}`
      const message =
        reason instanceof Error ? reason.message : 'An unexpected error occurred during the check'

      return {
        guidelineId,
        guidelineName: guidelineId,
        successCriterion: '',
        status: 'fail',
        score: 0,
        message: `Check error: ${message}`,
        impact: 'high',
        category: 'web-dev',
        machineTestable: true,
      }
    })
  }

  /** The number of registered check functions. */
  get checkCount(): number {
    return this.checks.length
  }
}
