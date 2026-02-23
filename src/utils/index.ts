/**
 * Public API for the utils module.
 *
 * Re-exports everything a consuming module needs from the shared utilities
 * so that imports can be written as `import { ... } from '@/utils'`.
 */

export { FetchError, ParseError, ConfigError, CheckError } from './errors'
export type { Result } from './errors'
export { ok, err } from './errors'

export type { LogLevel, LogEntry, LoggerOptions, Logger } from './logger'
export { createLogger, defaultLogger } from './logger'

export type { RedirectEntry, FetchResult, HttpClientOptions } from './http-client'
export { HttpClient } from './http-client'

export type {
  MetaTag,
  LinkRef,
  ResourceType,
  ResourceReference,
  HeadingNode,
  StructuredData,
  ParsedPage,
} from './html-parser'
export { parseHtml } from './html-parser'

export type { ResourceInfo, CompressionInfo, PageWeightAnalysis } from './resource-analyzer'
export { classifyResources, analyzeCompression, analyzePageWeight } from './resource-analyzer'

export type { CO2Model } from './carbon-estimator'
export { CO2_MODEL, estimateCO2, checkGreenHosting } from './carbon-estimator'
