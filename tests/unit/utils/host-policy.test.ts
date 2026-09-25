import { describe, it, expect, vi, beforeEach } from 'vitest'

const lookupMock = vi.fn()
vi.mock('node:dns/promises', () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}))

const { classifyAddress, classifyHost, evaluateUrl } = await import('@/utils/host-policy')

const LOOPBACK_ONLY = { allowLoopback: true, allowPrivateNetwork: false }
const STRICT = { allowLoopback: false, allowPrivateNetwork: false }

describe('classifyAddress', () => {
  it.each([
    ['93.184.216.34', 'public'], // NOSONAR - intentional public IP
    ['127.0.0.1', 'loopback'],
    ['127.10.0.1', 'loopback'],
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
