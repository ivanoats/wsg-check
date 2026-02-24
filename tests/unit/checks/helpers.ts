/**
 * Shared test helper functions for check module unit tests.
 *
 * These helpers provide type-safe assertions and prevent the need for non-null
 * assertions, which can lead to runtime errors.
 */

import type { CheckResult } from '@/core/types'
import { expect } from 'vitest'

/**
 * Asserts that a CheckResult has a resources array with at least one element.
 * Returns the first resource for further testing.
 *
 * This function acts as a type guard, confirming the array exists and has content
 * before allowing access to its elements. This is safer than using non-null assertions.
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
  expect(result.resources).toBeDefined()
  expect(result.resources).toBeInstanceOf(Array)
  // Type guard: after these assertions, we know resources is defined and is an array
  const resources = result.resources as string[]
  expect(resources.length).toBeGreaterThan(0)
  return resources[0]
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
