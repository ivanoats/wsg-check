/**
 * Custom error classes for wsg-check.
 *
 * Provides typed, descriptive errors for each failure domain so that callers
 * can catch and handle errors precisely without aborting the entire check run.
 */

/**
 * Thrown when a network or HTTP-level failure occurs while fetching a URL.
 */
export class FetchError extends Error {
  readonly url: string

  constructor(message: string, url: string, cause?: unknown) {
    super(message)
    this.name = 'FetchError'
    this.url = url
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}

/**
 * Thrown when HTML (or other document) content cannot be parsed.
 */
export class ParseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'ParseError'
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}

/**
 * Thrown when the resolved configuration is invalid or incomplete.
 */
export class ConfigError extends Error {
  readonly field?: string

  constructor(message: string, field?: string) {
    super(message)
    this.name = 'ConfigError'
    this.field = field
  }
}

/**
 * Thrown when an individual WSG check encounters an unexpected runtime error.
 * Allows the check runner to catch and record the failure gracefully rather
 * than propagating it and aborting all remaining checks.
 */
export class CheckError extends Error {
  readonly guidelineId: string

  constructor(message: string, guidelineId: string, cause?: unknown) {
    super(message)
    this.name = 'CheckError'
    this.guidelineId = guidelineId
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}
