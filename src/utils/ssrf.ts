/**
 * SSRF (Server-Side Request Forgery) protection utilities.
 *
 * These helpers identify private/loopback IP addresses and hostnames that must
 * not be fetched in response to externally-supplied URLs.  They are used both
 * at request-validation time (initial URL) and during redirect following
 * (every hop target).
 */

import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

export const isPrivateIpv4 = (address: string): boolean => {
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

export const isPrivateIpv6 = (address: string): boolean => {
  const lower = address.toLowerCase()
  if (lower === '::1') return true
  if (lower.startsWith('fe80:')) return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  return false
}

/** Returns `true` when the hostname is a private/loopback address or name. */
export const isDisallowedHost = (hostname: string): boolean => {
  const lower = hostname.toLowerCase()
  if (lower === 'localhost') return true
  if (lower.endsWith('.local')) return true

  const ipVersion = isIP(lower)
  if (ipVersion === 4) return isPrivateIpv4(lower)
  if (ipVersion === 6) return isPrivateIpv6(lower)

  return false
}

/**
 * Returns `true` when the hostname resolves exclusively to private/loopback
 * addresses, or when DNS resolution fails (treated as unsafe).
 */
export const dnsResolvesToPrivateAddress = async (hostname: string): Promise<boolean> => {
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
