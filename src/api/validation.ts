import { isDisallowedHost, dnsResolvesToPrivateAddress } from '../utils/ssrf'
import { ok, err, type Result } from '../utils/errors'
import type { CheckRequestBody } from './types'
import type { WSGCategory } from '../config/index'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

const VALID_CATEGORIES = new Set(['ux', 'web-dev', 'hosting'])

const hasInvalidCategories = (categories: ReadonlyArray<string>): boolean =>
  categories.some((category) => !VALID_CATEGORIES.has(category))

export const validateCheckPayload = (payload: unknown): Result<CheckRequestBody, Error> => {
  if (payload === null || typeof payload !== 'object') {
    return err(new Error('Request body must be a JSON object.'))
  }

  const record = payload as Record<string, unknown>
  if (typeof record.url !== 'string' || record.url.trim().length === 0) {
    return err(new Error('Field "url" is required and must be a non-empty string.'))
  }

  if (record.categories !== undefined && !Array.isArray(record.categories)) {
    return err(new Error('Field "categories" must be an array when provided.'))
  }

  if (Array.isArray(record.categories)) {
    const categories = record.categories
    const stringCategories = categories.filter((c): c is string => typeof c === 'string')

    if (stringCategories.length !== categories.length) {
      return err(
        new Error(
          'Field "categories" must contain only string values. Allowed: ux, web-dev, hosting.'
        )
      )
    }

    if (stringCategories.length === 0) {
      return err(
        new Error(
          'Field "categories" must contain at least one supported category. Allowed: ux, web-dev, hosting.'
        )
      )
    }

    if (hasInvalidCategories(stringCategories)) {
      return err(
        new Error('Field "categories" contains unsupported values. Allowed: ux, web-dev, hosting.')
      )
    }
  }

  if (record.guidelines !== undefined && !Array.isArray(record.guidelines)) {
    return err(new Error('Field "guidelines" must be an array when provided.'))
  }

  if (
    Array.isArray(record.guidelines) &&
    record.guidelines.some(
      (guideline) => typeof guideline !== 'string' || guideline.trim().length === 0
    )
  ) {
    return err(new Error('Field "guidelines" must contain non-empty guideline IDs.'))
  }

  if (
    record.format !== undefined &&
    record.format !== 'json' &&
    record.format !== 'html' &&
    record.format !== 'markdown'
  ) {
    return err(new Error('Field "format" must be one of: json, html, markdown.'))
  }

  return ok({
    url: record.url.trim(),
    ...(Array.isArray(record.categories)
      ? {
          // All categories are already validated as strings in VALID_CATEGORIES above.
          categories: record.categories as ReadonlyArray<WSGCategory>,
        }
      : {}),
    ...(Array.isArray(record.guidelines)
      ? {
          guidelines: record.guidelines.filter(
            (value): value is string => typeof value === 'string' && value.trim().length > 0
          ),
        }
      : {}),
    ...(record.format === 'json' || record.format === 'html' || record.format === 'markdown'
      ? { format: record.format }
      : {}),
  })
}

export const validateTargetUrl = async (rawUrl: string): Promise<Result<URL, Error>> => {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return err(new Error('The provided URL is invalid.'))
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return err(new Error('Only http and https URLs are supported.'))
  }

  if (isDisallowedHost(parsed.hostname)) {
    return err(new Error('Target URL host is not allowed for security reasons.'))
  }

  const privateResolution = await dnsResolvesToPrivateAddress(parsed.hostname)
  if (privateResolution) {
    return err(new Error('Target URL resolves to a private or unreachable network address.'))
  }

  return ok(parsed)
}
