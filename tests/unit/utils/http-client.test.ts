import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseRobotsTxt, isPathAllowed } from '@/utils/http-client'
import { FetchError } from '@/utils/errors'

// ─── parseRobotsTxt ───────────────────────────────────────────────────────────

describe('parseRobotsTxt', () => {
  it('returns empty rules for an empty file', () => {
    const rules = parseRobotsTxt('', 'wsg-check')
    expect(rules.allows).toEqual([])
    expect(rules.disallows).toEqual([])
  })

  it('parses a wildcard disallow all', () => {
    const content = `User-agent: *\nDisallow: /`
    const rules = parseRobotsTxt(content, 'wsg-check')
    expect(rules.disallows).toContain('/')
  })

  it('parses a specific user-agent block', () => {
    const content = `User-agent: wsg-check\nDisallow: /private/`
    const rules = parseRobotsTxt(content, 'wsg-check')
    expect(rules.disallows).toContain('/private/')
  })

  it('prefers specific agent over wildcard', () => {
    const content = [
      'User-agent: *',
      'Disallow: /',
      '',
      'User-agent: wsg-check',
      'Disallow: /private/',
    ].join('\n')
    const rules = parseRobotsTxt(content, 'wsg-check')
    // The specific wsg-check block should win
    expect(rules.disallows).toEqual(['/private/'])
    expect(rules.disallows).not.toContain('/')
  })

  it('matches via prefix when version suffix is present', () => {
    const content = `User-agent: wsg-check\nDisallow: /secret/`
    // userAgent includes a version; the parser strips it
    const rules = parseRobotsTxt(content, 'wsg-check/0.0.1')
    expect(rules.disallows).toContain('/secret/')
  })

  it('parses Allow directives', () => {
    const content = `User-agent: *\nDisallow: /\nAllow: /public/`
    const rules = parseRobotsTxt(content, 'anybot')
    expect(rules.allows).toContain('/public/')
  })

  it('ignores comment lines', () => {
    const content = `# this is a comment\nUser-agent: *\nDisallow: /admin/`
    const rules = parseRobotsTxt(content, 'bot')
    expect(rules.disallows).toContain('/admin/')
  })

  it('strips inline comments', () => {
    const content = `User-agent: * # everyone\nDisallow: /secret/ # keep out`
    const rules = parseRobotsTxt(content, 'bot')
    expect(rules.disallows).toContain('/secret/')
  })
})

// ─── isPathAllowed ────────────────────────────────────────────────────────────

describe('isPathAllowed', () => {
  it('allows all when disallows is empty', () => {
    expect(isPathAllowed('/anything', { allows: [], disallows: [] })).toBe(true)
  })

  it('disallows a path that matches a Disallow rule', () => {
    const rules = { allows: [], disallows: ['/private/'] }
    expect(isPathAllowed('/private/data', rules)).toBe(false)
  })

  it('allows a path that does not match any Disallow rule', () => {
    const rules = { allows: [], disallows: ['/private/'] }
    expect(isPathAllowed('/public/page', rules)).toBe(true)
  })

  it('allows when a more-specific Allow overrides a Disallow', () => {
    const rules = { allows: ['/private/allowed/'], disallows: ['/private/'] }
    expect(isPathAllowed('/private/allowed/page', rules)).toBe(true)
  })

  it('still disallows when Disallow is more specific than Allow', () => {
    const rules = { allows: ['/'], disallows: ['/private/'] }
    // Allow '/' is less specific (length 1) than Disallow '/private/' (length 9)
    expect(isPathAllowed('/private/data', rules)).toBe(false)
  })

  it('treats an empty Disallow entry as allow-all', () => {
    const rules = { allows: [], disallows: [''] }
    expect(isPathAllowed('/anything', rules)).toBe(true)
  })

  it('disallows everything when Disallow is /', () => {
    const rules = { allows: [], disallows: ['/'] }
    expect(isPathAllowed('/index.html', rules)).toBe(false)
  })
})

// ─── HttpClient (mocked axios) ────────────────────────────────────────────────

// Shared mock for the axios instance returned by axios.create()
const mockGet = vi.fn()

vi.mock('axios', () => {
  class MockAxiosError extends Error {
    response?: { status: number }
    constructor(
      message: string,
      _config?: unknown,
      _code?: string,
      _request?: unknown,
      response?: { status: number }
    ) {
      super(message)
      this.name = 'AxiosError'
      this.response = response
    }
  }

  return {
    default: {
      create: () => ({ get: mockGet }),
    },
    AxiosError: MockAxiosError,
  }
})

// Import after vi.mock so the mock is in effect
const { HttpClient } = await import('@/utils/http-client')

// Helper: build a minimal axios response object
function axiosResp(status: number, data: string, headers: Record<string, string> = {}) {
  return { status, data, headers }
}

describe('HttpClient', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('constructs with default options', () => {
    const client = new HttpClient()
    expect(client).toBeInstanceOf(HttpClient)
  })

  it('returns ok result with fetch data on success', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(
      axiosResp(200, '<html>hello</html>', { 'content-type': 'text/html' })
    )

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/page')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.statusCode).toBe(200)
    expect(result.value.body).toBe('<html>hello</html>')
    expect(result.value.fromCache).toBe(false)
    expect(result.value.url).toBe('https://example.com/page')
    expect(result.value.redirectChain).toEqual([])
  })

  it('returns ok result with fromCache true on a second fetch', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient()
    await client.fetch('https://example.com/')
    const cached = await client.fetch('https://example.com/')

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(cached.ok).toBe(true)
    if (!cached.ok) return
    expect(cached.value.fromCache).toBe(true)
  })

  it('returns err result when robots.txt disallows the URL', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(200, 'User-agent: *\nDisallow: /'))

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/page')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBeInstanceOf(FetchError)
  })

  it('ignores robots.txt when ignoreRobots is true', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/', { ignoreRobots: true })

    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.statusCode).toBe(200)
  })

  it('follows redirects and records the chain', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(301, '', { location: 'https://example.com/new' }))
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/old')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.redirectChain).toHaveLength(1)
    expect(result.value.redirectChain[0].statusCode).toBe(301)
    expect(result.value.url).toBe('https://example.com/new')
  })

  it('does not follow redirects when followRedirects is false', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(301, '', { location: 'https://example.com/new' }))

    const client = new HttpClient({ followRedirects: false })
    const result = await client.fetch('https://example.com/old')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.statusCode).toBe(301)
    expect(result.value.redirectChain).toHaveLength(0)
  })

  it('returns err result on too many redirects', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValue(axiosResp(301, '', { location: 'https://example.com/loop' }))

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/loop')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBeInstanceOf(FetchError)
  })

  it('returns err result when redirect has no Location header', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(301, '', {})) // no Location

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/page')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBeInstanceOf(FetchError)
  })

  it('retries on a network error and succeeds on the next attempt', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockRejectedValueOnce(new Error('ECONNRESET'))
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient({ retryDelay: 0 })
    const result = await client.fetch('https://example.com/')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.statusCode).toBe(200)
  })

  it('includes content-encoding and content-type in the result', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, ''))
    mockGet.mockResolvedValueOnce(
      axiosResp(200, 'body', {
        'content-encoding': 'gzip',
        'content-type': 'text/html; charset=utf-8',
      })
    )

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.contentEncoding).toBe('gzip')
    expect(result.value.contentType).toBe('text/html; charset=utf-8')
  })

  it('uses content-length header as contentLength when present', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, ''))
    mockGet.mockResolvedValueOnce(
      axiosResp(200, 'body', {
        'content-length': '42',
        'content-encoding': 'gzip',
      })
    )

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.contentLength).toBe(42)
  })

  it('falls back to body length for contentLength when header is absent', async () => {
    const body = '<html>hello</html>'
    mockGet.mockResolvedValueOnce(axiosResp(404, ''))
    mockGet.mockResolvedValueOnce(axiosResp(200, body))

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.contentLength).toBe(body.length)
  })

  it('isAllowedByRobots returns true when path is allowed', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(200, 'User-agent: *\nAllow: /'))

    const client = new HttpClient()
    const allowed = await client.isAllowedByRobots('https://example.com/page')
    expect(allowed).toBe(true)
  })

  it('isAllowedByRobots returns false when path is disallowed', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(200, 'User-agent: *\nDisallow: /private/'))

    const client = new HttpClient()
    const allowed = await client.isAllowedByRobots('https://example.com/private/data')
    expect(allowed).toBe(false)
  })

  it('clearCache resets the response cache', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, ''))
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient()
    await client.fetch('https://example.com/')
    client.clearCache()

    mockGet.mockResolvedValueOnce(axiosResp(404, ''))
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))
    const result = await client.fetch('https://example.com/')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.fromCache).toBe(false)
  })

  it('clearRobotsCache resets the robots.txt cache', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(200, 'User-agent: *\nAllow: /'))
    const client = new HttpClient()
    await client.isAllowedByRobots('https://example.com/')
    client.clearRobotsCache()

    mockGet.mockResolvedValueOnce(axiosResp(404, ''))
    await client.isAllowedByRobots('https://example.com/')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('handles array-valued response headers', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, ''))
    mockGet.mockResolvedValueOnce({
      status: 200,
      data: '<html/>',
      headers: { 'set-cookie': ['a=1', 'b=2'] },
    })

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.headers['set-cookie']).toBe('a=1, b=2')
  })

  it('returns err result on non-retryable AxiosError', async () => {
    const { AxiosError } = await import('axios')
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    const axiosErr = new AxiosError('Not found', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 404,
      data: '',
      headers: {},
      config: {} as never,
      statusText: 'Not Found',
      request: {},
    })
    mockGet.mockRejectedValue(axiosErr)

    const client = new HttpClient({ maxRetries: 0 })
    const result = await client.fetch('https://example.com/page')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBeInstanceOf(FetchError)
  })
})
