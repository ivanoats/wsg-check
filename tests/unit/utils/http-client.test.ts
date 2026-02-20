import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FetchError } from '@/utils/errors'

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
