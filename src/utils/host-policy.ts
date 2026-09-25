/**
 * Configurable network access policy for outbound page fetches.
 *
 * The web API keeps its strict SSRF rules (see `ssrf.ts`). Local tools such
 * as the MCP server need to reach a developer's dev server on loopback while
 * still refusing other internal targets, so `HttpClient` accepts a
 * `HostPolicy` and applies it to the initial URL and to every redirect hop.
 */

import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

/** Where an address or hostname points. */
export type AddressClass = 'public' | 'loopback' | 'private' | 'reserved'

export interface HostPolicy {
  /** Allow `localhost`, `127.0.0.0/8`, and `::1`. */
  readonly allowLoopback: boolean
  /** Allow `10/8`, `172.16/12`, `192.168/16`, `fc00::/7`, and `.local` names. */
  readonly allowPrivateNetwork: boolean
}

/** The outcome of checking one URL against a policy. */
export type HostDecision =
  | { readonly allowed: true; readonly addressClass: AddressClass }
  | { readonly allowed: false; readonly reason: string }

// ─── Classification ───────────────────────────────────────────────────────────

const classifyIpv4 = (address: string): AddressClass => {
  const [a, b] = address.split('.').map((part) => Number.parseInt(part, 10))
  if (a === 127) return 'loopback'
  if (a === 10) return 'private'
  if (a === 172 && b >= 16 && b <= 31) return 'private'
  if (a === 192 && b === 168) return 'private'
  // 0.0.0.0/8 can reach local services; 169.254/16 includes cloud metadata.
  if (a === 0) return 'reserved'
  if (a === 169 && b === 254) return 'reserved'
  return 'public'
}

const classifyIpv6 = (address: string): AddressClass => {
  const lower = address.toLowerCase()
  if (lower === '::1') return 'loopback'
  if (lower === '::') return 'reserved'
  if (lower.startsWith('::ffff:')) {
    const mapped = lower.substring(lower.lastIndexOf(':') + 1)
    if (isIP(mapped) === 4) return classifyIpv4(mapped)
  }
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return 'reserved'
  if (lower.startsWith('fc') || lower.startsWith('fd')) return 'private'
  return 'public'
}

/** Classifies an IP literal. */
export const classifyAddress = (address: string): AddressClass => {
  const version = isIP(address)
  if (version === 4) return classifyIpv4(address)
  if (version === 6) return classifyIpv6(address)
  return 'reserved'
}

/** Strips the brackets that `URL.hostname` keeps around IPv6 literals. */
const unbracket = (hostname: string): string => hostname.replace(/^\[(.*)\]$/, '$1')

/**
 * Classifies a hostname by name, then by every address it resolves to.
 * Returns the most restrictive class so that a name resolving to both a
 * public and an internal address is treated as internal. Unresolvable names
 * are `reserved` (blocked).
 */
export const classifyHost = async (hostname: string): Promise<AddressClass> => {
  const host = unbracket(hostname.toLowerCase())
  if (host === 'localhost' || host.endsWith('.localhost')) return 'loopback'
  if (host.endsWith('.local')) return 'private'
  if (isIP(host) !== 0) return classifyAddress(host)

  try {
    const records = await lookup(host, { all: true })
    const classes = records.map((record) => classifyAddress(record.address))
    return mostRestrictive(classes)
  } catch {
    return 'reserved'
  }
}

const RESTRICTIVENESS: Record<AddressClass, number> = {
  public: 0,
  loopback: 1,
  private: 2,
  reserved: 3,
}

const mostRestrictive = (classes: ReadonlyArray<AddressClass>): AddressClass =>
  classes.reduce<AddressClass>(
    (worst, current) => (RESTRICTIVENESS[current] > RESTRICTIVENESS[worst] ? current : worst),
    classes.length === 0 ? 'reserved' : 'public'
  )

// ─── Decisions ────────────────────────────────────────────────────────────────

const isClassAllowed = (addressClass: AddressClass, policy: HostPolicy): boolean => {
  switch (addressClass) {
    case 'public':
      return true
    case 'loopback':
      return policy.allowLoopback
    case 'private':
      return policy.allowPrivateNetwork
    default:
      return false
  }
}

const DENIAL_REASONS: Record<Exclude<AddressClass, 'public'>, string> = {
  loopback: 'loopback addresses are not allowed',
  private: 'private network addresses are not allowed',
  reserved: 'the host is link-local, reserved, or could not be resolved',
}

/**
 * Checks a URL against `policy`.
 *
 * @param from - The class of the URL that redirected here, if any. A redirect
 *               from a non-loopback host into loopback is always refused, so
 *               checking a public page can never land on a local service.
 */
export const evaluateUrl = async (
  url: string,
  policy: HostPolicy,
  from?: AddressClass
): Promise<HostDecision> => {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { allowed: false, reason: `the ${parsed.protocol} scheme is not allowed` }
  }

  const addressClass = await classifyHost(parsed.hostname)
  if (addressClass !== 'public' && !isClassAllowed(addressClass, policy)) {
    return { allowed: false, reason: DENIAL_REASONS[addressClass] }
  }
  if (from !== undefined && addressClass === 'loopback' && from !== 'loopback') {
    return {
      allowed: false,
      reason: 'redirects from a non-loopback host into loopback are not allowed',
    }
  }
  return { allowed: true, addressClass }
}
