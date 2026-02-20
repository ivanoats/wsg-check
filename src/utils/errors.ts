/**
 * Custom error classes for wsg-check.
 *
 * Provides typed, descriptive errors for each failure domain so that callers
 * can catch and handle errors precisely without aborting the entire check run.
 *
 * Also exports a `Result<T, E>` discriminated union for callers who prefer a
 * functional, exception-free style at API boundaries.
 */

// ─── Result type ──────────────────────────────────────────────────────────────

/**
 * A discriminated union representing the outcome of an operation that can
 * succeed or fail without throwing.
 *
 * @example
 * ```ts
 * const result: Result<FetchResult, FetchError> = await client.fetch(url)
 * if (result.ok) {
 *   console.log(result.value.statusCode)
 * } else {
 *   console.error(result.error.message)
 * }
 * ```
 */
export type Result<T, E extends Error = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

/** Construct a successful `Result`. */
export function ok<T>(value: T): { readonly ok: true; readonly value: T } {
  return { ok: true, value }
}

/** Construct a failure `Result`. */
export function err<E extends Error>(error: E): { readonly ok: false; readonly error: E } {
  return { ok: false, error }
}

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
