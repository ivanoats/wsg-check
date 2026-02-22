import { describe, it, expect, vi, beforeEach } from 'vitest'

const lookupMock = vi.fn()
vi.mock('node:dns/promises', () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}))

const { validateCheckPayload, validateTargetUrl } = await import('@/api/validation')

describe('validateCheckPayload', () => {
  it('rejects non-object payloads', () => {
    const result = validateCheckPayload(null)
    expect(result.ok).toBe(false)
  })

  it('rejects missing url', () => {
    const result = validateCheckPayload({ categories: ['ux'] })
    expect(result.ok).toBe(false)
  })

  it('rejects invalid categories', () => {
    const result = validateCheckPayload({
      url: 'https://example.com',
      categories: ['unknown'],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects categories containing non-string items', () => {
    const result = validateCheckPayload({
      url: 'https://example.com',
      categories: [123],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('only string values')
    }
  })

  it('rejects empty categories array', () => {
    const result = validateCheckPayload({
      url: 'https://example.com',
      categories: [],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('at least one')
    }
  })

  it('accepts valid payload', () => {
    const result = validateCheckPayload({
      url: 'https://example.com',
      categories: ['ux', 'web-dev'],
      guidelines: ['3.1'],
      format: 'json',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.url).toBe('https://example.com')
      expect(result.value.categories).toEqual(['ux', 'web-dev'])
      expect(result.value.guidelines).toEqual(['3.1'])
      expect(result.value.format).toBe('json')
    }
  })
})

describe('validateTargetUrl', () => {
  beforeEach(() => {
    lookupMock.mockReset()
  })

  it('rejects malformed URLs', async () => {
    const result = await validateTargetUrl('not-a-url')
    expect(result.ok).toBe(false)
  })

  it('rejects unsupported protocol', async () => {
    const result = await validateTargetUrl('ftp://example.com/file')
    expect(result.ok).toBe(false)
  })

  it('rejects localhost', async () => {
    const result = await validateTargetUrl('http://localhost:3000')
    expect(result.ok).toBe(false)
  })

  it('rejects private IPv4 hosts', async () => {
    const result = await validateTargetUrl('https://192.168.0.5')
    expect(result.ok).toBe(false)
  })

  it('rejects hostnames resolving to private addresses', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }]) // NOSONAR - intentional private IP for SSRF test
    const result = await validateTargetUrl('https://example.com')
    expect(result.ok).toBe(false)
  })

  it('accepts public hostnames with public DNS resolution', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]) // NOSONAR - intentional public IP for SSRF test
    const result = await validateTargetUrl('https://example.com')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.hostname).toBe('example.com')
    }
  })
})
