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
  getGuidelineById,
  getGuidelinesByCategory,
  getGuidelinesByTestability,
} from './guidelines-registry'

export { loadFromEnv, loadFromFile, resolveConfig } from './loader'
export type { ResolvedConfig } from './loader'

export type {
  WsgApiCriterion,
  WsgApiGuideline,
  WsgApiCategory,
  WsgApiResponse,
} from './wsg-api-types'

export {
  WSG_GUIDELINES_API_URL,
  WsgApiError,
  TESTABILITY_OVERLAY,
  fetchWsgGuidelines,
  mapApiToGuidelineEntries,
} from './wsg-api-client'
