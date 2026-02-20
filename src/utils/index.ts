/**
 * Public API for the utils module.
 *
 * Re-exports everything a consuming module needs from the shared utilities
 * so that imports can be written as `import { ... } from '@/utils'`.
 */

export { FetchError, ParseError, ConfigError, CheckError } from './errors.js'

export type { LogLevel, LogEntry, LoggerOptions, Logger } from './logger.js'
export { createLogger, defaultLogger } from './logger.js'

export type { RedirectEntry, FetchResult, RobotsTxtRule, HttpClientOptions } from './http-client.js'
export { HttpClient, parseRobotsTxt, isPathAllowed } from './http-client.js'

export type {
  MetaTag,
  LinkRef,
  ResourceType,
  ResourceReference,
  HeadingNode,
  StructuredData,
  ParsedPage,
} from './html-parser.js'
export { parseHtml } from './html-parser.js'

export type { ResourceInfo, CompressionInfo, PageWeightAnalysis } from './resource-analyzer.js'
export { classifyResources, analyzeCompression, analyzePageWeight } from './resource-analyzer.js'
