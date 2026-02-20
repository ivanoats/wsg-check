import path from 'path'
import { existsSync, readFileSync } from 'fs'
import type { WSGCheckConfig, PartialWSGCheckConfig, WSGCategory, OutputFormat } from './types.js'
import { DEFAULT_CONFIG } from './defaults.js'

/**
 * Map environment variables to configuration fields.
 *
 * The following env vars are recognised (all optional):
 *   WSG_URL                 – target URL
 *   WSG_CATEGORIES          – comma-separated list (ux,web-dev,hosting,business)
 *   WSG_GUIDELINES          – comma-separated guideline IDs to run
 *   WSG_EXCLUDE_GUIDELINES  – comma-separated guideline IDs to skip
 *   WSG_TIMEOUT             – request timeout in ms
 *   WSG_MAX_DEPTH           – crawl depth
 *   WSG_USER_AGENT          – custom user-agent string
 *   WSG_FOLLOW_REDIRECTS    – "true" | "false"
 *   WSG_FORMAT              – output format (json|html|markdown|terminal)
 *   WSG_OUTPUT_PATH         – file path for output
 *   WSG_VERBOSE             – "true" | "false"
 *   WSG_FAIL_THRESHOLD      – number 0-100
 *   REQUEST_TIMEOUT_MS      – alias for WSG_TIMEOUT
 *   MAX_CRAWL_DEPTH         – alias for WSG_MAX_DEPTH
 */
export function loadFromEnv(): PartialWSGCheckConfig {
  const cfg: PartialWSGCheckConfig = {}

  const url = process.env.WSG_URL
  if (url) cfg.url = url

  const categories = process.env.WSG_CATEGORIES
  if (categories) {
    cfg.categories = categories.split(',').map((c) => c.trim() as WSGCategory)
  }

  const guidelines = process.env.WSG_GUIDELINES
  if (guidelines) {
    cfg.guidelines = guidelines.split(',').map((g) => g.trim())
  }

  const excludeGuidelines = process.env.WSG_EXCLUDE_GUIDELINES
  if (excludeGuidelines) {
    cfg.excludeGuidelines = excludeGuidelines.split(',').map((g) => g.trim())
  }

  const timeout = process.env.WSG_TIMEOUT ?? process.env.REQUEST_TIMEOUT_MS
  if (timeout) cfg.timeout = parseInt(timeout, 10)

  const maxDepth = process.env.WSG_MAX_DEPTH ?? process.env.MAX_CRAWL_DEPTH
  if (maxDepth) cfg.maxDepth = parseInt(maxDepth, 10)

  const userAgent = process.env.WSG_USER_AGENT
  if (userAgent) cfg.userAgent = userAgent

  const followRedirects = process.env.WSG_FOLLOW_REDIRECTS
  if (followRedirects !== undefined) {
    cfg.followRedirects = followRedirects !== 'false'
  }

  const format = process.env.WSG_FORMAT
  if (format) cfg.format = format as OutputFormat

  const outputPath = process.env.WSG_OUTPUT_PATH
  if (outputPath) cfg.outputPath = outputPath

  const verbose = process.env.WSG_VERBOSE
  if (verbose !== undefined) {
    cfg.verbose = verbose === 'true'
  }

  const failThreshold = process.env.WSG_FAIL_THRESHOLD
  if (failThreshold) cfg.failThreshold = parseInt(failThreshold, 10)

  return cfg
}

/**
 * Attempt to load a config file from the given directory.
 *
 * Looks for (in order):
 *   1. wsg-check.config.json
 *   2. .wsgcheckrc.json
 *
 * Returns an empty object if no config file is found.
 */
export function loadFromFile(dir: string = process.cwd()): PartialWSGCheckConfig {
  const candidates = [path.join(dir, 'wsg-check.config.json'), path.join(dir, '.wsgcheckrc.json')]

  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, 'utf8')
      return JSON.parse(raw) as PartialWSGCheckConfig
    }
  }

  return {}
}

/**
 * A fully resolved configuration where all fields except `url` are guaranteed
 * to have a value (either from defaults, file, env, or CLI flags).
 * `url` remains optional because there is no sensible default; callers must
 * supply it via CLI flags, environment variable, or config file before
 * attempting a check run.
 */
export type ResolvedConfig = Omit<WSGCheckConfig, 'url'> & { url?: string }

/**
 * Merge configuration from all sources with the following precedence
 * (highest wins):
 *
 *   CLI flags > environment variables > config file > defaults
 */
export function resolveConfig(
  cliFlags: PartialWSGCheckConfig = {},
  configFileDir?: string
): ResolvedConfig {
  const fromFile = loadFromFile(configFileDir)
  const fromEnv = loadFromEnv()

  const merged = {
    ...DEFAULT_CONFIG,
    ...fromFile,
    ...fromEnv,
    ...cliFlags,
  }

  return merged as ResolvedConfig
}
