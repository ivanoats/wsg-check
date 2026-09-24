export type {
  WSGCategory,
  OutputFormat,
  Testability,
  WSGCheckConfig,
  PartialWSGCheckConfig,
  GuidelineEntry,
} from './types'

export { DEFAULT_CONFIG } from './defaults'

export {
  GUIDELINES_REGISTRY,
  TESTABILITY_OVERLAY,
  LEGACY_GUIDELINE_IDS,
  UNMAPPED_LEGACY_IDS,
  mapSpecToGuidelineEntries,
  resolveGuidelineId,
  isLegacyGuidelineId,
  isSameGuideline,
  getGuidelineById,
  getGuidelinesByCategory,
  getGuidelinesByTestability,
} from './guidelines-registry'

export { WSG_SPEC, WSG_SPEC_DATA } from './spec/index'
export type { WsgSpecInfo } from './spec/index'

export { loadFromEnv, loadFromFile, resolveConfig } from './loader'
export type { ResolvedConfig } from './loader'

export type {
  WsgSpecCriterion,
  WsgSpecGuideline,
  WsgSpecCategory,
  WsgSpecData,
} from './wsg-spec-types'
