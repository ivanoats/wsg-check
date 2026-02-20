/**
 * Configuration types for wsg-check.
 */

export type WSGCategory = 'ux' | 'web-dev' | 'hosting' | 'business'

export type OutputFormat = 'json' | 'html' | 'markdown' | 'terminal'

export type Testability = 'automated' | 'semi-automated' | 'manual-only'

/**
 * The main configuration interface for wsg-check.
 * Settings can be provided via environment variables, a config file,
 * or CLI flags (CLI flags take highest precedence).
 */
export interface WSGCheckConfig {
  // Target
  url: string

  // Check selection
  categories: WSGCategory[]
  guidelines: string[] // e.g., ["3.1", "3.2", "3.7"]; empty means all
  excludeGuidelines: string[]

  // Behavior
  timeout: number // HTTP request timeout (ms)
  maxDepth: number // Crawl depth (1 = single page)
  userAgent: string
  followRedirects: boolean

  // Output
  format: OutputFormat
  outputPath?: string
  verbose: boolean

  // Thresholds
  failThreshold: number // Fail if score below this (0-100)
}

/**
 * Partial config accepted as user input (all fields optional except url for CLI use).
 */
export type PartialWSGCheckConfig = Partial<WSGCheckConfig>

/**
 * A single entry in the WSG guidelines registry.
 */
export interface GuidelineEntry {
  id: string // e.g., "2.1"
  title: string
  section: string // Section name
  category: WSGCategory
  testability: Testability
  description: string
}
