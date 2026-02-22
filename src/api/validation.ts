import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import type { CheckRequestBody } from './types.js'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

const isPrivateIpv4 = (address: string): boolean => {
  const [a, b] = address.split('.').map((part) => Number.parseInt(part, 10))
  if ([a, b].some((part) => Number.isNaN(part))) return true
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

const isPrivateIpv6 = (address: string): boolean => {
  const lower = address.toLowerCase()
  if (lower === '::1') return true
  if (lower.startsWith('fe80:')) return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  return false
}

const isDisallowedHost = (hostname: string): boolean => {
  const lower = hostname.toLowerCase()
  if (lower === 'localhost') return true
  if (lower.endsWith('.local')) return true

  const ipVersion = isIP(lower)
  if (ipVersion === 4) return isPrivateIpv4(lower)
  if (ipVersion === 6) return isPrivateIpv6(lower)

  return false
}

const dnsResolvesToPrivateAddress = async (hostname: string): Promise<boolean> => {
  try {
    const resolved = await lookup(hostname, { all: true })
    return resolved.some((record) => {
      if (record.family === 4) return isPrivateIpv4(record.address)
      if (record.family === 6) return isPrivateIpv6(record.address)
      return true
    })
  } catch {
    return true
  }
}

const VALID_CATEGORIES = new Set(['ux', 'web-dev', 'hosting', 'business'])

const hasInvalidCategories = (categories: ReadonlyArray<string>): boolean =>
  categories.some((category) => !VALID_CATEGORIES.has(category))

export const validateCheckPayload = (
  payload: unknown
):
  | { readonly ok: false; readonly message: string }
  | { readonly ok: true; readonly value: CheckRequestBody } => {
  if (payload === null || typeof payload !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object.' }
  }

  const record = payload as Record<string, unknown>
  if (typeof record.url !== 'string' || record.url.trim().length === 0) {
    return { ok: false, message: 'Field "url" is required and must be a non-empty string.' }
  }

  if (record.categories !== undefined && !Array.isArray(record.categories)) {
    return { ok: false, message: 'Field "categories" must be an array when provided.' }
  }

  if (
    Array.isArray(record.categories) &&
    hasInvalidCategories(record.categories.filter((c): c is string => typeof c === 'string'))
  ) {
    return {
      ok: false,
      message:
        'Field "categories" contains unsupported values. Allowed: ux, web-dev, hosting, business.',
    }
  }

  if (record.guidelines !== undefined && !Array.isArray(record.guidelines)) {
    return { ok: false, message: 'Field "guidelines" must be an array when provided.' }
  }

  if (
    Array.isArray(record.guidelines) &&
    record.guidelines.some(
      (guideline) => typeof guideline !== 'string' || guideline.trim().length === 0
    )
  ) {
    return { ok: false, message: 'Field "guidelines" must contain non-empty guideline IDs.' }
  }

  if (
    record.format !== undefined &&
    record.format !== 'json' &&
    record.format !== 'html' &&
    record.format !== 'markdown'
  ) {
    return { ok: false, message: 'Field "format" must be one of: json, html, markdown.' }
  }

  return {
    ok: true,
    value: {
      url: record.url.trim(),
      ...(Array.isArray(record.categories)
        ? {
            categories: record.categories.filter(
              (value): value is 'ux' | 'web-dev' | 'hosting' | 'business' =>
                typeof value === 'string' && VALID_CATEGORIES.has(value)
            ),
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
    },
  }
}

export const validateTargetUrl = async (
  rawUrl: string
): Promise<
  { readonly ok: true; readonly url: URL } | { readonly ok: false; readonly message: string }
> => {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { ok: false, message: 'The provided URL is invalid.' }
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, message: 'Only http and https URLs are supported.' }
  }

  if (isDisallowedHost(parsed.hostname)) {
    return { ok: false, message: 'Target URL host is not allowed for security reasons.' }
  }

  const privateResolution = await dnsResolvesToPrivateAddress(parsed.hostname)
  if (privateResolution) {
    return {
      ok: false,
      message: 'Target URL resolves to a private or unreachable network address.',
    }
  }

  return { ok: true, url: parsed }
}
