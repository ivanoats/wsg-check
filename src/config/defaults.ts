import type { WSGCheckConfig } from './types.js'

/**
 * Sensible default configuration values for wsg-check.
 * These are the lowest-precedence settings; they are overridden by
 * environment variables, config files, and CLI flags.
 */
export const DEFAULT_CONFIG: Omit<WSGCheckConfig, 'url'> = {
  categories: ['ux', 'web-dev', 'hosting', 'business'],
  guidelines: [], // empty = run all guidelines
  excludeGuidelines: [],

  timeout: 30_000, // 30 seconds
  maxDepth: 1, // single page by default
  userAgent: 'Mozilla/5.0 (compatible; wsg-check/0.0.1; +https://github.com/ivanoats/wsg-check)',
  followRedirects: true,

  format: 'terminal',
  outputPath: undefined,
  verbose: false,

  failThreshold: 0, // don't fail by default
}
