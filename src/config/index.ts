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
