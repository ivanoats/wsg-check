/**
 * Shared labelling helpers for report formatters: how a guideline is named in
 * tables and headings, and how related (unscored) checks are separated out.
 */

import type { CheckResult } from '../../core/types'

/** Explains related checks wherever they are listed. */
export const RELATED_CHECKS_NOTE =
  'These checks have no guideline in the targeted WSG release. They are reported but not scored.'

interface GuidelineLabelled {
  readonly guidelineId: string
  readonly guidelineNumber?: string
  readonly related?: boolean
}

/**
 * Short label for tables and headings: the WSG display number (e.g. `"3.2"`)
 * when there is one, `"Related"` for related checks, else the raw ID.
 */
export const guidelineLabel = (item: GuidelineLabelled): string =>
  item.guidelineNumber ?? (item.related === true ? 'Related' : item.guidelineId)

/** Splits results into scored WSG checks and related (unscored) checks. */
export const partitionChecks = (
  checks: ReadonlyArray<CheckResult>
): { readonly wsg: ReadonlyArray<CheckResult>; readonly related: ReadonlyArray<CheckResult> } => ({
  wsg: checks.filter((c) => c.related !== true),
  related: checks.filter((c) => c.related === true),
})
