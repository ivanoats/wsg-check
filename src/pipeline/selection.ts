/**
 * Check selection shared by the CLI, the API, and the MCP server.
 *
 * Pure: returns the selected checks and any user-facing notices as data,
 * and leaves it to each caller to decide where notices are shown.
 */

import type { CheckFnWithId } from '../core/types'
import {
  performanceChecks,
  semanticChecks,
  sustainabilityChecks,
  securityChecks,
  uxDesignChecks,
  hostingChecks,
} from '../checks/index'
import { checkMatchesGuideline, isLegacyGuidelineId } from '../config/guidelines-registry'
import { WSG_SPEC } from '../config/spec/index'
import type { WSGCategory } from '../config/types'

/** Categories that have automated checks. `business` has none yet. */
export const DEFAULT_CATEGORIES: ReadonlyArray<WSGCategory> = ['ux', 'web-dev', 'hosting']

/** Every registered check, regardless of category. */
export const ALL_CHECKS: ReadonlyArray<CheckFnWithId> = [
  ...performanceChecks,
  ...semanticChecks,
  ...sustainabilityChecks,
  ...securityChecks,
  ...uxDesignChecks,
  ...hostingChecks,
]

/** A message about the request, e.g. a deprecated guideline ID. */
export interface SelectionNotice {
  /** `note` is informational; `warning` asks the user to change their input. */
  readonly level: 'note' | 'warning'
  readonly message: string
}

export interface CheckSelection {
  readonly checks: ReadonlyArray<CheckFnWithId>
  readonly notices: ReadonlyArray<SelectionNotice>
}

/**
 * Describes what replaces a legacy numeric ID, based on the checks registered
 * under it: the WSG slugs they implement and the IDs of any related
 * (unscored) checks. For example, `2.17` covers downloadable documents (a WSG
 * guideline) and alt text (a related check).
 */
const describeLegacyReplacement = (id: string): string => {
  const checks = ALL_CHECKS.filter((check) => check.guidelineId === id)
  const quoted = (ids: ReadonlyArray<string | null>): string =>
    [...new Set(ids.filter((value): value is string => value !== null))]
      .map((value) => JSON.stringify(value))
      .join(', ')

  const release = `WSG ${WSG_SPEC.release}`
  const slugs = quoted(checks.map((check) => check.guidelineSlug))
  const relatedIds = quoted(checks.map((check) => check.relatedId))

  const parts = [
    ...(slugs === '' ? [] : [`use ${slugs} (${release})`]),
    ...(relatedIds === '' ? [] : [`use ${relatedIds} (related check, not scored)`]),
  ]
  return parts.length === 0 ? `it has no equivalent in ${release}` : parts.join('; ')
}

/**
 * Selects check functions by category, then narrows them to the requested
 * guideline IDs (slugs, related-check IDs, or legacy numeric IDs) when any
 * are given.
 */
export const selectChecks = (
  categories: ReadonlyArray<WSGCategory> = DEFAULT_CATEGORIES,
  guidelines: ReadonlyArray<string> = []
): CheckSelection => {
  const selected = new Set<WSGCategory>(categories)

  const categoryChecks: ReadonlyArray<CheckFnWithId> = [
    ...(selected.has('web-dev')
      ? [...performanceChecks, ...semanticChecks, ...sustainabilityChecks, ...securityChecks]
      : []),
    ...(selected.has('ux') ? [...uxDesignChecks] : []),
    ...(selected.has('hosting') ? [...hostingChecks] : []),
  ]

  const notices: ReadonlyArray<SelectionNotice> = [
    ...(selected.has('business')
      ? [
          {
            level: 'note' as const,
            message: 'the "business" category has no automated checks in the current version.',
          },
        ]
      : []),
    ...guidelines.filter(isLegacyGuidelineId).map((id) => ({
      level: 'warning' as const,
      message: `numeric guideline ID "${id}" is deprecated; ${describeLegacyReplacement(id)}.`,
    })),
  ]

  const checks =
    guidelines.length > 0
      ? categoryChecks.filter((check) => guidelines.some((g) => checkMatchesGuideline(check, g)))
      : categoryChecks

  return { checks, notices }
}
