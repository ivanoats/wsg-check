export type {
  WSGCategory,
  OutputFormat,
  Testability,
  WSGCheckConfig,
  PartialWSGCheckConfig,
  GuidelineEntry,
} from './types.js'

export { DEFAULT_CONFIG } from './defaults.js'

export {
  GUIDELINES_REGISTRY,
  getGuidelineById,
  getGuidelinesByCategory,
  getGuidelinesByTestability,
} from './guidelines-registry.js'

export { loadFromEnv, loadFromFile, resolveConfig } from './loader.js'
export type { ResolvedConfig } from './loader.js'

export type {
  WsgApiCriterion,
  WsgApiGuideline,
  WsgApiCategory,
  WsgApiResponse,
} from './wsg-api-types.js'

export {
  WSG_GUIDELINES_API_URL,
  WsgApiError,
  TESTABILITY_OVERLAY,
  fetchWsgGuidelines,
  mapApiToGuidelineEntries,
} from './wsg-api-client.js'
export type { Ok, Err, Result } from './wsg-api-client.js'
