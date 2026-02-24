/**
 * Shared test helper functions for check module unit tests.
 *
 * These helpers provide type-safe assertions and prevent the need for non-null
 * assertions, which can lead to runtime errors.
 */

import type { CheckResult } from '@/core/types'
import { expect } from 'vitest'

/**
 * Assertion helper that narrows `value` to a non-empty `string[]`.
 * TypeScript recognises the `asserts` return type and narrows the type of
 * the argument after this call — no cast required.
 */
const assertNonEmptyStringArray: (value: unknown) => asserts value is string[] = (value) => {
  expect(value).toBeDefined()
  expect(value).toBeInstanceOf(Array)
  // Array.isArray narrows the type so we can access .length without a cast
  if (Array.isArray(value)) {
    expect(value.length).toBeGreaterThan(0)
  }
}

/**
 * Asserts that a CheckResult has a resources array with at least one element.
 * Returns the first resource for further testing.
 *
 * Uses a real TypeScript assertion function so callers benefit from proper
 * type narrowing without any type casts.
 *
 * @param result - The CheckResult to validate
 * @returns The first resource string for further assertions
 *
 * @example
 * ```typescript
 * const result = await checkHtmlVersion(makePageData({ doctype: null }))
 * const firstResource = expectResourcesDefined(result)
 * expect(firstResource).toContain('w3.org')
 * ```
 */
export const expectResourcesDefined = (result: CheckResult): string => {
  assertNonEmptyStringArray(result.resources)
  return result.resources[0]
}

/**
 * Asserts that a CheckResult has both recommendation and resources defined,
 * and returns the first resource for further testing.
 *
 * This is a convenience function for the common pattern of checking both
 * recommendation and resources in non-passing check results.
 *
 * @param result - The CheckResult to validate
 * @returns The first resource string for further assertions
 *
 * @example
 * ```typescript
 * const result = await checkMetadata(makePageData({ title: '' }))
 * const firstResource = expectRecommendationAndResources(result)
 * expect(firstResource).toContain('w3.org')
 * ```
 */
export const expectRecommendationAndResources = (result: CheckResult): string => {
  expect(result.recommendation).toBeDefined()
  expect(result.recommendation).not.toBe('')
  return expectResourcesDefined(result)
}
