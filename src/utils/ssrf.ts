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
import { normalizeHost, parseIpv6 } from './host-policy'

/**
 * Returns `true` when the IPv4 address is in a private/loopback range.
 *
 * Note: this function is only called after `isIP(hostname) === 4` confirms
 * the input is a valid four-octet IPv4 address, so incomplete-octet strings
 * like "10" will never reach here.
 */
export const isPrivateIpv4 = (address: string): boolean => {
  const [a, b] = address.split('.').map((part) => Number.parseInt(part, 10))
  if ([a, b].some((part) => Number.isNaN(part))) return true
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return a === 192 && b === 168
}

export const isPrivateIpv6 = (address: string): boolean => {
  const lower = address.toLowerCase()
  // Unspecified and loopback
  if (lower === '::' || lower === '::1') return true

  // IPv4-mapped IPv6 (::ffff:0:0/96): private when the embedded IPv4 is. Parse the
  // groups because `URL` and `dns.lookup` spell these in hex (::ffff:7f00:1).
  const groups = parseIpv6(lower)
  if (groups !== null) {
    const [g0, g1, g2, g3, g4, g5, g6, g7] = groups
    if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
      return isPrivateIpv4(`${g6 >> 8}.${g6 & 0xff}.${g7 >> 8}.${g7 & 0xff}`)
    }
  }

  // Link-local fe80::/10 — covers fe80, fe90, fea0, feb0 (second nibble 8–b)
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true

  // Unique local fc00::/7 (fc00::/8 and fd00::/8)
  return lower.startsWith('fc') || lower.startsWith('fd')
}

/** Returns `true` when the hostname is a private/loopback address or name. */
export const isDisallowedHost = (hostname: string): boolean => {
  // `URL.hostname` keeps the brackets around IPv6 literals, which `isIP` rejects.
  const host = normalizeHost(hostname)
  if (host === 'localhost') return true
  if (host.endsWith('.local')) return true

  const ipVersion = isIP(host)
  if (ipVersion === 4) return isPrivateIpv4(host)
  if (ipVersion === 6) return isPrivateIpv6(host)

  return false
}

/**
 * Returns `true` when the hostname resolves to any private/loopback address,
 * or when DNS resolution fails (treated as unsafe).
 *
 * Using `some` rather than `every` is intentional: if a hostname resolves to
 * both a public and a private IP, the connection could still be routed to the
 * private IP, so we block it to prevent SSRF attacks via dual-homed hosts or
 * split-horizon DNS.
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
