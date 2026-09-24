import { GUIDELINES_REGISTRY, getGuidelineById } from '../config/guidelines-registry'
import { WSG_SPEC } from '../config/spec/index'
import type { WsgSpecInfo } from '../config/spec/index'
import type { GuidelineEntry } from '../config/types'

interface GuidelineListResult {
  readonly spec: WsgSpecInfo
  readonly guidelines: ReadonlyArray<GuidelineEntry>
}

interface GuidelineLookupResult {
  readonly spec: WsgSpecInfo
  readonly guideline?: GuidelineEntry
}

/** Returns every guideline in the WSG release that wsg-check targets. */
export const loadGuidelines = (): GuidelineListResult => ({
  spec: WSG_SPEC,
  guidelines: GUIDELINES_REGISTRY,
})

/** Looks up a guideline by slug or by legacy numeric ID (e.g. `"3.3"`). */
export const findGuidelineById = (id: string): GuidelineLookupResult => ({
  spec: WSG_SPEC,
  guideline: getGuidelineById(id),
})
