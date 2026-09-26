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
  // 0.0.0.0/8 can reach local services; 169.254/16 includes cloud metadata;
  // 224/4 and above are multicast and reserved.
  if (a === 0 || a >= 224) return 'reserved'
  if (a === 169 && b === 254) return 'reserved'
  return 'public'
}

/** Rewrites a trailing dotted IPv4 part (e.g. `::ffff:1.2.3.4`) as two hex groups. */
const inlineIpv4Tail = (text: string): string | null => {
  const lastColon = text.lastIndexOf(':')
  const tail = text.slice(lastColon + 1)
  if (!tail.includes('.')) return text
  if (isIP(tail) !== 4) return null
  const [a, b, c, d] = tail.split('.').map(Number)
  return `${text.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
}

/**
 * Expands an IPv6 literal into its eight 16-bit groups, so that every
 * spelling of an address (`::1`, `0:0:0:0:0:0:0:1`, `::ffff:127.0.0.1`,
 * `::ffff:7f00:1`) classifies the same way. Returns `null` when invalid.
 */
export const parseIpv6 = (address: string): number[] | null => {
  const withoutZone = address.toLowerCase().split('%')[0]
  const text = inlineIpv4Tail(withoutZone)
  if (text === null) return null

  const halves = text.split('::')
  if (halves.length > 2) return null
  const head = halves[0] === '' ? [] : halves[0].split(':')
  const tail = halves.length === 2 && halves[1] !== '' ? halves[1].split(':') : []
  const fill = 8 - head.length - tail.length
  if (halves.length === 1 ? head.length !== 8 : fill < 1) return null

  const groups = [...head, ...Array<string>(halves.length === 2 ? fill : 0).fill('0'), ...tail]
  const values = groups.map((group) =>
    /^[0-9a-f]{1,4}$/u.test(group) ? Number.parseInt(group, 16) : Number.NaN
  )
  return values.some(Number.isNaN) ? null : values
}

const embeddedIpv4 = (high: number, low: number): string =>
  `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`

const classifyIpv6 = (address: string): AddressClass => {
  const groups = parseIpv6(address)
  if (groups === null) return 'reserved'
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups
  const firstFiveZero = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0

  if (firstFiveZero && g5 === 0) {
    // ::1 is loopback; :: and deprecated IPv4-compatible forms are reserved.
    return g6 === 0 && g7 === 1 ? 'loopback' : 'reserved'
  }
  // IPv4-mapped (::ffff:0:0/96) and NAT64 (64:ff9b::/96) embed an IPv4 address.
  const isMapped = firstFiveZero && g5 === 0xffff
  const isNat64 = g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0
  if (isMapped || isNat64) return classifyIpv4(embeddedIpv4(g6, g7))

  if ((g0 & 0xffc0) === 0xfe80) return 'reserved' // link-local fe80::/10
  if ((g0 & 0xff00) === 0xff00) return 'reserved' // multicast ff00::/8
  if ((g0 & 0xfe00) === 0xfc00) return 'private' // unique local fc00::/7
  if ((g0 & 0xffc0) === 0xfec0) return 'private' // deprecated site-local fec0::/10
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
const unbracket = (hostname: string): string => hostname.replace(/^\[(.*)\]$/u, '$1')

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

// ─── Decisions ────────────────────────────────────────────────────────────────

const isClassAllowed = (
  addressClass: Exclude<AddressClass, 'public'>,
  policy: HostPolicy
): boolean => {
  switch (addressClass) {
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

// ─── Connection-time pinning ──────────────────────────────────────────────────

/** A resolved address in the shape HTTP clients' `lookup` options expect. */
export interface ResolvedAddress {
  readonly address: string
  readonly family: 4 | 6
}

type LookupCallback = (err: Error | null, addresses: ResolvedAddress[]) => void

/**
 * Returns a DNS lookup for an HTTP request that only connects to addresses in
 * `expected`, the class `evaluateUrl` approved for that host. Checking the
 * addresses the connection actually uses closes the gap a DNS-rebinding host
 * could otherwise exploit between validation and connection.
 */
export const createPinnedLookup =
  (expected: AddressClass) =>
  (hostname: string, _options: object, callback: LookupCallback): void => {
    lookup(hostname, { all: true }).then(
      (records) => {
        const mismatch = records.find((record) => classifyAddress(record.address) !== expected)
        if (records.length === 0 || mismatch !== undefined) {
          callback(
            new Error(
              `Host ${hostname} resolved to ${mismatch?.address ?? 'no address'}, outside the approved ${expected} range`
            ),
            []
          )
          return
        }
        callback(
          null,
          records.map(({ address, family }) => ({ address, family: family === 6 ? 6 : 4 }))
        )
      },
      (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), [])
    )
  }
