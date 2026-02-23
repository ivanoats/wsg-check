import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DNS before importing ssrf module
const lookupMock = vi.fn()
vi.mock('node:dns/promises', () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}))

const { isPrivateIpv4, isPrivateIpv6, isDisallowedHost, dnsResolvesToPrivateAddress } =
  await import('@/utils/ssrf')

describe('isPrivateIpv4', () => {
  it('returns true for 10.x.x.x addresses', () => {
    expect(isPrivateIpv4('10.0.0.0')).toBe(true)
    expect(isPrivateIpv4('10.255.255.255')).toBe(true)
    expect(isPrivateIpv4('10.1.2.3')).toBe(true)
  })

  it('returns true for 127.x.x.x loopback addresses', () => {
    expect(isPrivateIpv4('127.0.0.1')).toBe(true)
    expect(isPrivateIpv4('127.255.255.255')).toBe(true)
  })

  it('returns true for 0.x.x.x addresses', () => {
    expect(isPrivateIpv4('0.0.0.0')).toBe(true)
    expect(isPrivateIpv4('0.1.2.3')).toBe(true)
  })

  it('returns true for 169.254.x.x link-local addresses', () => {
    expect(isPrivateIpv4('169.254.0.0')).toBe(true)
    expect(isPrivateIpv4('169.254.169.254')).toBe(true)
  })

  it('returns false for 169.255.x.x (not link-local)', () => {
    expect(isPrivateIpv4('169.255.0.0')).toBe(false)
  })

  it('returns true for 172.16.x.x through 172.31.x.x addresses', () => {
    expect(isPrivateIpv4('172.16.0.0')).toBe(true)
    expect(isPrivateIpv4('172.16.254.1')).toBe(true)
    expect(isPrivateIpv4('172.31.255.255')).toBe(true)
  })

  it('returns false for 172.15.x.x (just below private range)', () => {
    expect(isPrivateIpv4('172.15.0.0')).toBe(false)
  })

  it('returns false for 172.32.x.x (just above private range)', () => {
    expect(isPrivateIpv4('172.32.0.0')).toBe(false)
  })

  it('returns true for 192.168.x.x addresses', () => {
    expect(isPrivateIpv4('192.168.0.0')).toBe(true)
    expect(isPrivateIpv4('192.168.1.1')).toBe(true)
    expect(isPrivateIpv4('192.168.255.255')).toBe(true)
  })

  it('returns false for 192.169.x.x (not private)', () => {
    expect(isPrivateIpv4('192.169.0.0')).toBe(false)
  })

  it('returns false for public IP addresses', () => {
    expect(isPrivateIpv4('8.8.8.8')).toBe(false)
    expect(isPrivateIpv4('93.184.216.34')).toBe(false) // NOSONAR - intentional public IP for SSRF test
    expect(isPrivateIpv4('1.1.1.1')).toBe(false)
  })

  it('returns true when parts cannot be parsed as integers', () => {
    // A string that passes isIP()==4 check would have valid octets, but the NaN guard
    // is a safety net; we test the guard by calling the function directly with an
    // address whose leading segment cannot be parsed.
    expect(isPrivateIpv4('abc.0.0.1')).toBe(true)
  })
})

describe('isPrivateIpv6', () => {
  it('returns true for :: (unspecified address)', () => {
    expect(isPrivateIpv6('::')).toBe(true)
  })

  it('returns true for ::1 (loopback)', () => {
    expect(isPrivateIpv6('::1')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isPrivateIpv6('::1')).toBe(true)
    expect(isPrivateIpv6('FE80::1')).toBe(true)
    expect(isPrivateIpv6('FC00::1')).toBe(true)
    expect(isPrivateIpv6('FD00::1')).toBe(true)
  })

  it('returns true for ::ffff: mapped private IPv4 addresses', () => {
    expect(isPrivateIpv6('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateIpv6('::ffff:10.0.0.1')).toBe(true) // NOSONAR - intentional private IP for SSRF test
    expect(isPrivateIpv6('::ffff:192.168.1.1')).toBe(true) // NOSONAR - intentional private IP for SSRF test
  })

  it('returns false for ::ffff: mapped public IPv4 addresses', () => {
    expect(isPrivateIpv6('::ffff:93.184.216.34')).toBe(false) // NOSONAR - intentional public IP for SSRF test
    expect(isPrivateIpv6('::ffff:8.8.8.8')).toBe(false)
  })

  it('returns true for fe80::/10 link-local addresses', () => {
    expect(isPrivateIpv6('fe80::1')).toBe(true)
    expect(isPrivateIpv6('fe80::abcd:ef01')).toBe(true)
  })

  it('returns true for fc00::/8 unique-local addresses', () => {
    expect(isPrivateIpv6('fc00::1')).toBe(true)
    expect(isPrivateIpv6('fc00:dead:beef::1')).toBe(true)
  })

  it('returns true for fd00::/8 unique-local addresses', () => {
    expect(isPrivateIpv6('fd00::1')).toBe(true)
    expect(isPrivateIpv6('fdff:ffff:ffff:ffff::1')).toBe(true)
  })

  it('returns false for public IPv6 addresses', () => {
    expect(isPrivateIpv6('2001:db8::1')).toBe(false)
    expect(isPrivateIpv6('2606:2800:220:1:248:1893:25c8:1946')).toBe(false)
  })
})

describe('isDisallowedHost', () => {
  it('returns true for localhost', () => {
    expect(isDisallowedHost('localhost')).toBe(true)
  })

  it('returns true for localhost regardless of case', () => {
    expect(isDisallowedHost('LOCALHOST')).toBe(true)
    expect(isDisallowedHost('LocalHost')).toBe(true)
  })

  it('returns true for .local domains', () => {
    expect(isDisallowedHost('myhost.local')).toBe(true)
    expect(isDisallowedHost('printer.local')).toBe(true)
  })

  it('returns true for .local domains regardless of case', () => {
    expect(isDisallowedHost('MYHOST.LOCAL')).toBe(true)
  })

  it('returns true for private IPv4 addresses', () => {
    expect(isDisallowedHost('10.0.0.1')).toBe(true) // NOSONAR - intentional private IP for SSRF test
    expect(isDisallowedHost('192.168.1.1')).toBe(true) // NOSONAR - intentional private IP for SSRF test
    expect(isDisallowedHost('172.16.0.1')).toBe(true) // NOSONAR - intentional private IP for SSRF test
    expect(isDisallowedHost('127.0.0.1')).toBe(true) // NOSONAR - intentional private IP for SSRF test
  })

  it('returns false for public IPv4 addresses', () => {
    expect(isDisallowedHost('8.8.8.8')).toBe(false)
    expect(isDisallowedHost('93.184.216.34')).toBe(false) // NOSONAR - intentional public IP for SSRF test
  })

  it('returns true for private IPv6 addresses', () => {
    expect(isDisallowedHost('::1')).toBe(true)
    expect(isDisallowedHost('fe80::1')).toBe(true)
    expect(isDisallowedHost('fc00::1')).toBe(true)
  })

  it('returns false for public IPv6 addresses', () => {
    expect(isDisallowedHost('2001:db8::1')).toBe(false)
  })

  it('returns false for regular public domain names', () => {
    expect(isDisallowedHost('example.com')).toBe(false)
    expect(isDisallowedHost('google.com')).toBe(false)
  })
})

describe('dnsResolvesToPrivateAddress', () => {
  beforeEach(() => {
    lookupMock.mockReset()
  })

  it('returns true when hostname resolves to private IPv4', async () => {
    lookupMock.mockResolvedValue([{ address: '10.0.0.1', family: 4 }]) // NOSONAR - intentional private IP for SSRF test
    expect(await dnsResolvesToPrivateAddress('internal.example.com')).toBe(true)
  })

  it('returns false when hostname resolves to public IPv4', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]) // NOSONAR - intentional public IP for SSRF test
    expect(await dnsResolvesToPrivateAddress('example.com')).toBe(false)
  })

  it('returns true when DNS resolution fails (fail-safe)', async () => {
    lookupMock.mockRejectedValue(new Error('ENOTFOUND'))
    expect(await dnsResolvesToPrivateAddress('nonexistent.example.com')).toBe(true)
  })

  it('returns true when hostname resolves to private IPv6', async () => {
    lookupMock.mockResolvedValue([{ address: 'fd00::1', family: 6 }])
    expect(await dnsResolvesToPrivateAddress('ipv6-internal.example.com')).toBe(true)
  })

  it('returns true when hostname resolves to mix of private and public (conservative)', async () => {
    lookupMock.mockResolvedValue([
      { address: '93.184.216.34', family: 4 }, // NOSONAR - intentional public IP for SSRF test
      { address: '10.0.0.1', family: 4 }, // NOSONAR - intentional private IP for SSRF test
    ])
    expect(await dnsResolvesToPrivateAddress('dual-homed.example.com')).toBe(true)
  })

  it('returns true for records with unknown address family (conservative)', async () => {
    lookupMock.mockResolvedValue([{ address: 'some-addr', family: 99 }])
    expect(await dnsResolvesToPrivateAddress('unknown.example.com')).toBe(true)
  })

  it('returns true when hostname resolves to loopback ::1 (IPv6)', async () => {
    lookupMock.mockResolvedValue([{ address: '::1', family: 6 }])
    expect(await dnsResolvesToPrivateAddress('localhost-ipv6.example.com')).toBe(true)
  })
})
