import { describe, it, expect, vi, beforeEach } from 'vitest'

const lookupMock = vi.fn()
vi.mock('node:dns/promises', () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}))

const {
  classifyAddress,
  classifyHost,
  createPinnedLookup,
  evaluateUrl,
  isLocalHostname,
  parseIpv6,
} = await import('@/utils/host-policy')

const LOOPBACK_ONLY = { allowLoopback: true, allowPrivateNetwork: false }
const STRICT = { allowLoopback: false, allowPrivateNetwork: false }

describe('classifyAddress', () => {
  it.each([
    ['93.184.216.34', 'public'], // NOSONAR - intentional public IP
    ['127.0.0.1', 'loopback'],
    ['127.10.0.1', 'loopback'],
    ['2606:4700:4700::1111', 'public'],
    ['::1', 'loopback'],
    ['::ffff:127.0.0.1', 'loopback'],
    ['10.1.2.3', 'private'], // NOSONAR - intentional private IP
    ['172.16.0.1', 'private'], // NOSONAR - intentional private IP
    ['172.31.255.255', 'private'], // NOSONAR - intentional private IP
    ['172.32.0.1', 'public'], // NOSONAR - intentional public IP
    ['192.168.0.1', 'private'], // NOSONAR - intentional private IP
    ['fd12::1', 'private'],
    ['169.254.169.254', 'reserved'], // NOSONAR - intentional metadata IP
    ['fe80::1', 'reserved'],
    ['0.0.0.0', 'reserved'], // NOSONAR - intentional unspecified IP
    ['::', 'reserved'],
    ['not-an-ip', 'reserved'],
    ['224.0.0.1', 'reserved'], // NOSONAR - intentional multicast IP
    // Every spelling of an address must classify the same way.
    ['0:0:0:0:0:0:0:1', 'loopback'],
    ['0:0:0:0:0:0:0:0', 'reserved'],
    ['::ffff:7f00:1', 'loopback'],
    ['0:0:0:0:0:ffff:7f00:1', 'loopback'],
    ['::ffff:a00:1', 'private'],
    ['::ffff:169.254.169.254', 'reserved'], // NOSONAR - intentional metadata IP
    ['64:ff9b::7f00:1', 'loopback'],
    ['64:ff9b::5db8:d822', 'public'],
    ['::127.0.0.1', 'reserved'], // NOSONAR - deprecated IPv4-compatible form
    ['FE80::1', 'reserved'],
    ['fe80::1%eth0', 'reserved'],
    ['ff02::1', 'reserved'],
    ['fec0::1', 'private'],
  ])('%s is %s', (address, expected) => {
    expect(classifyAddress(address)).toBe(expected)
  })
})

describe('classifyHost', () => {
  beforeEach(() => {
    lookupMock.mockReset()
  })

  it('classifies localhost names without DNS', async () => {
    expect(await classifyHost('localhost')).toBe('loopback')
    expect(await classifyHost('app.localhost')).toBe('loopback')
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it('treats .local names as private', async () => {
    expect(await classifyHost('printer.local')).toBe('private')
  })

  it('handles bracketed IPv6 hostnames from URL.hostname', async () => {
    expect(await classifyHost('[::1]')).toBe('loopback')
  })

  it('uses the most restrictive resolved address', async () => {
    lookupMock.mockResolvedValue([
      { address: '93.184.216.34', family: 4 }, // NOSONAR - intentional public IP
      { address: '10.0.0.1', family: 4 }, // NOSONAR - intentional private IP
    ])
    expect(await classifyHost('dual.example')).toBe('private')
  })

  it('treats unresolvable names as reserved', async () => {
    lookupMock.mockRejectedValue(new Error('ENOTFOUND'))
    expect(await classifyHost('nope.invalid')).toBe('reserved')
  })
})

describe('evaluateUrl', () => {
  beforeEach(() => {
    lookupMock.mockReset()
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]) // NOSONAR - intentional public IP
  })

  it('allows public hosts under any policy', async () => {
    expect(await evaluateUrl('https://example.com/', STRICT)).toEqual({
      allowed: true,
      addressClass: 'public',
    })
  })

  it('refuses non-HTTP schemes', async () => {
    const decision = await evaluateUrl('file:///etc/passwd', LOOPBACK_ONLY)
    expect(decision.allowed).toBe(false)
  })

  it('allows loopback only when the policy does', async () => {
    expect((await evaluateUrl('http://localhost:3000/', LOOPBACK_ONLY)).allowed).toBe(true)
    expect((await evaluateUrl('http://localhost:3000/', STRICT)).allowed).toBe(false)
  })

  it('refuses a redirect into loopback from a non-loopback host', async () => {
    const decision = await evaluateUrl('http://localhost:3000/', LOOPBACK_ONLY, 'public')
    expect(decision).toEqual({
      allowed: false,
      reason: 'redirects from a non-loopback host into loopback are not allowed',
    })
  })

  it('allows a redirect from loopback to loopback', async () => {
    const decision = await evaluateUrl('http://127.0.0.1:3000/en', LOOPBACK_ONLY, 'loopback')
    expect(decision.allowed).toBe(true)
  })
})

describe('parseIpv6', () => {
  it('expands compressed and embedded-IPv4 forms to eight groups', () => {
    expect(parseIpv6('::1')).toEqual([0, 0, 0, 0, 0, 0, 0, 1])
    expect(parseIpv6('::ffff:127.0.0.1')).toEqual([0, 0, 0, 0, 0, 0xffff, 0x7f00, 1])
    expect(parseIpv6('2001:db8::')).toEqual([0x2001, 0xdb8, 0, 0, 0, 0, 0, 0])
  })

  it('rejects malformed addresses', () => {
    for (const bad of [
      '1::2::3',
      '1:2:3',
      '1:2:3:4:5:6:7:8:9',
      '::ffff:999.0.0.1',
      'g::1',
      '1:2:3:4:5:6:7::8',
    ]) {
      expect(parseIpv6(bad)).toBeNull()
    }
  })
})

describe('evaluateUrl — normalized IPv6 URLs', () => {
  it('refuses IPv4-mapped loopback that URL parsing rewrites to hex', async () => {
    // new URL() turns [::ffff:127.0.0.1] into [::ffff:7f00:1].
    const decision = await evaluateUrl('http://[::ffff:127.0.0.1]/', STRICT)
    expect(decision).toEqual({ allowed: false, reason: 'loopback addresses are not allowed' })
  })

  it('refuses expanded IPv6 loopback', async () => {
    expect((await evaluateUrl('http://[0:0:0:0:0:0:0:1]/', STRICT)).allowed).toBe(false)
  })
})

describe('createPinnedLookup', () => {
  beforeEach(() => {
    lookupMock.mockReset()
  })

  const run = (expected: Parameters<typeof createPinnedLookup>[0], hostname = 'example.com') =>
    new Promise<{ err: Error | null; addresses: unknown[] }>((resolve) => {
      createPinnedLookup(expected)(hostname, {}, (err, addresses) => resolve({ err, addresses }))
    })

  it('returns the resolved addresses when they match the approved class', async () => {
    lookupMock.mockResolvedValue([
      { address: '93.184.216.34', family: 4 }, // NOSONAR - intentional public IP
      { address: '2606:2800:220:1::1', family: 6 },
    ])
    const { err, addresses } = await run('public')
    expect(err).toBeNull()
    expect(addresses).toEqual([
      { address: '93.184.216.34', family: 4 }, // NOSONAR - intentional public IP
      { address: '2606:2800:220:1::1', family: 6 },
    ])
  })

  it('refuses a host that re-resolves to loopback after approval as public (DNS rebinding)', async () => {
    lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }])
    const { err } = await run('public', 'rebind.example')
    expect(err?.message).toContain('outside the approved public range')
  })

  it('refuses when resolution returns no addresses', async () => {
    lookupMock.mockResolvedValue([])
    expect((await run('public')).err).toBeInstanceOf(Error)
  })

  it('passes DNS errors through', async () => {
    lookupMock.mockRejectedValue(new Error('ENOTFOUND'))
    expect((await run('public')).err?.message).toBe('ENOTFOUND')
  })
})

describe('isLocalHostname', () => {
  it.each([
    'localhost',
    'LOCALHOST',
    'app.localhost',
    'nas.local',
    '127.0.0.1',
    '10.0.0.2',
    '[::1]',
    '169.254.169.254',
  ])('%s is local', (host) => {
    expect(isLocalHostname(host)).toBe(true)
  })

  it.each(['example.com', '93.184.216.34', '[2606:4700:4700::1111]', 'localhost.example.com'])(
    '%s is not local',
    (host) => {
      expect(isLocalHostname(host)).toBe(false)
    }
  )

  it('never makes a DNS lookup', () => {
    lookupMock.mockClear()
    isLocalHostname('example.com')
    expect(lookupMock).not.toHaveBeenCalled()
  })
})
