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

// Mock DNS to return a public address so SSRF checks pass for test redirects
const lookupMock = vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]) // NOSONAR - intentional public IP for SSRF test
vi.mock('node:dns/promises', () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}))

// Import after vi.mock so the mock is in effect
const { HttpClient } = await import('@/utils/http-client')

// Helper: build a minimal axios response object
function axiosResp(status: number, data: string, headers: Record<string, string> = {}) {
  return { status, data, headers }
}

describe('HttpClient', () => {
  beforeEach(() => {
    mockGet.mockReset()
    lookupMock.mockReset()
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]) // NOSONAR - intentional public IP for SSRF test
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

    // robots, page and four standard-file probes; the second fetch is cached
    expect(mockGet).toHaveBeenCalledTimes(6)
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

  it('bounds the standard-file requests even when the client timeout is 0 (unlimited)', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    await new HttpClient({ timeout: 0 }).fetch('https://example.com/')

    const probeTimeouts = mockGet.mock.calls
      .filter(([url]) => /\/(humans|security|carbon)\.txt$/.test(url as string))
      .map(([, config]) => (config as { timeout?: number }).timeout)
    expect(probeTimeouts).toEqual([5_000, 5_000, 5_000, 5_000])
  })

  it('ignores robots.txt when ignoreRobots is true', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/', { ignoreRobots: true })

    // page and four standard-file probes
    expect(mockGet).toHaveBeenCalledTimes(5)
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

  it('returns err result when redirect targets a private address', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(301, '', { location: 'http://internal.example.com/' }))
    lookupMock.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]) // NOSONAR - intentional private IP for SSRF test

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/redirect-to-internal')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBeInstanceOf(FetchError)
    expect(result.error.message).toContain('private or unreachable')
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

  it('reports the bytes received as contentLength, not the header or body length', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, ''))
    mockGet.mockImplementationOnce(
      (_url: string, config: { onDownloadProgress?: (e: { loaded: number }) => void }) => {
        config.onDownloadProgress?.({ loaded: 10 })
        return Promise.resolve(
          axiosResp(200, '<html>hello</html>', {
            'content-length': '42',
            'content-encoding': 'gzip',
          })
        )
      }
    )

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.contentLength).toBe(10)
    expect(result.value.body).toBe('<html>hello</html>')
    expect(result.value.bodyByteLength).toBe(Buffer.byteLength('<html>hello</html>'))
  })

  it('reports 0 contentLength when no body bytes were received', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, ''))
    mockGet.mockResolvedValueOnce(axiosResp(200, ''))

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.contentLength).toBe(0)
  })

  it('recovers content-encoding from raw response headers when axios has removed it', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, ''))
    mockGet.mockImplementationOnce(
      (_url: string, config: { onDownloadProgress?: (e: { loaded: number }) => void }) => {
        config.onDownloadProgress?.({ loaded: 56 })
        return Promise.resolve({
          ...axiosResp(200, '<html/>', { 'content-type': 'text/html', 'content-length': '56' }),
          request: {
            res: {
              rawHeaders: [
                'Content-Type',
                'text/html',
                'Content-Encoding',
                'gzip',
                'Content-Length',
                '56',
              ],
            },
          },
        })
      }
    )

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.contentEncoding).toBe('gzip')
    expect(result.value.headers['content-encoding']).toBe('gzip')
    expect(result.value.contentLength).toBe(56)
  })

  it('keeps an explicit content-encoding header over raw headers', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, ''))
    mockGet.mockResolvedValueOnce({
      ...axiosResp(200, '<html/>', { 'content-encoding': 'br' }),
      request: { res: { rawHeaders: ['Content-Encoding', 'gzip'] } },
    })

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.contentEncoding).toBe('br')
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

  it('exposes Sitemap: lines from robots.txt on the result', async () => {
    mockGet.mockResolvedValueOnce(
      axiosResp(
        200,
        'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\nSitemap: https://example.com/news.xml'
      )
    )
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/page')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.robotsSitemaps).toEqual([
      'https://example.com/sitemap.xml',
      'https://example.com/news.xml',
    ])
    // robots, page and four standard-file probes
    expect(mockGet).toHaveBeenCalledTimes(6)
  })

  it('returns an empty robotsSitemaps when robots.txt is unavailable', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/page')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.robotsSitemaps).toEqual([])
  })

  it('omits robotsSitemaps when ignoreRobots is true', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient()
    const result = await client.fetch('https://example.com/page', { ignoreRobots: true })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.robotsSitemaps).toBeUndefined()
    // page and four standard-file probes
    expect(mockGet).toHaveBeenCalledTimes(5)
  })

  it('keeps robotsSitemaps on a cached fetch', async () => {
    mockGet.mockResolvedValueOnce(
      axiosResp(200, 'User-agent: *\nSitemap: https://example.com/sitemap.xml')
    )
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient()
    await client.fetch('https://example.com/page')
    const second = await client.fetch('https://example.com/page')

    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.value.fromCache).toBe(true)
    expect(second.value.robotsSitemaps).toEqual(['https://example.com/sitemap.xml'])
  })
})

describe('HttpClient — host policy', () => {
  const LOCAL_DEV = { allowLoopback: true, allowPrivateNetwork: false }

  beforeEach(() => {
    mockGet.mockReset()
    lookupMock.mockReset()
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]) // NOSONAR - intentional public IP
  })

  it('fetches a loopback dev server when loopback is allowed', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient({ hostPolicy: LOCAL_DEV })
    const result = await client.fetch('http://localhost:3000/')

    expect(result.ok).toBe(true)
  })

  it('refuses a blocked initial URL before requesting anything, including robots.txt', async () => {
    const client = new HttpClient({
      hostPolicy: { allowLoopback: false, allowPrivateNetwork: false },
    })
    const result = await client.fetch('http://127.0.0.1:8080/')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('loopback addresses are not allowed')
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('refuses private network hosts unless allowed', async () => {
    lookupMock.mockResolvedValue([{ address: '192.168.1.20', family: 4 }]) // NOSONAR - intentional private IP

    const blocked = await new HttpClient({ hostPolicy: LOCAL_DEV }).fetch('http://nas.example/')
    expect(blocked.ok).toBe(false)

    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))
    const allowed = await new HttpClient({
      hostPolicy: { allowLoopback: true, allowPrivateNetwork: true },
    }).fetch('http://nas.example/')
    expect(allowed.ok).toBe(true)
  })

  it('always refuses link-local and metadata addresses', async () => {
    const client = new HttpClient({
      hostPolicy: { allowLoopback: true, allowPrivateNetwork: true },
    })
    const result = await client.fetch('http://169.254.169.254/latest/meta-data/') // NOSONAR - intentional metadata IP

    expect(result.ok).toBe(false)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('follows redirects within loopback', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(307, '', { location: '/en' }))
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient({ hostPolicy: LOCAL_DEV })
    const result = await client.fetch('http://localhost:3000/')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.url).toBe('http://localhost:3000/en')
  })

  it('refuses a redirect from a public host into loopback', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(302, '', { location: 'http://localhost:6379/' }))

    const client = new HttpClient({ hostPolicy: LOCAL_DEV })
    const result = await client.fetch('https://example.com/')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('into loopback are not allowed')
  })

  it('pins the robots.txt, page and standard-file requests to the approved address class', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    await new HttpClient({ hostPolicy: LOCAL_DEV }).fetch('https://example.com/')

    expect(mockGet).toHaveBeenCalledTimes(6)
    for (const [, config] of mockGet.mock.calls) {
      expect(typeof (config as { lookup?: unknown }).lookup).toBe('function')
    }
  })

  it('pins standard-file requests after a cross-origin redirect to the class the redirect guard approved', async () => {
    // a.example and b.example look public while the page is fetched, then
    // b.example rebinds to loopback (TTL 0) before the standard files are requested.
    lookupMock.mockReset()
    lookupMock
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]) // NOSONAR - intentional public IP
      .mockResolvedValueOnce([{ address: '93.184.216.35', family: 4 }]) // NOSONAR - intentional public IP
      .mockResolvedValue([{ address: '127.0.0.1', family: 4 }])
    mockGet.mockResolvedValueOnce(axiosResp(302, '', { location: 'https://b.example/' }))
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const result = await new HttpClient({ hostPolicy: LOCAL_DEV }).fetch('https://a.example/', {
      ignoreRobots: true,
    })

    expect(result.ok).toBe(true)
    const probes = mockGet.mock.calls.slice(2)
    expect(probes).toHaveLength(4)
    for (const [url, config] of probes) {
      expect(url).toMatch(/^https:\/\/b\.example\//)
      const { lookup } = config as {
        lookup: (host: string, opts: object, cb: (err: Error | null) => void) => void
      }
      const error = await new Promise<Error | null>((resolve) =>
        lookup('b.example', {}, (e) => resolve(e))
      )
      expect(error, 'probe connected to a loopback address').toBeInstanceOf(Error)
      expect(error?.message).toContain('outside the approved public range')
    }
  })

  it('does not pin requests when no policy is set', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    await new HttpClient().fetch('https://example.com/')

    for (const [, config] of mockGet.mock.calls) {
      expect((config as { lookup?: unknown }).lookup).toBeUndefined()
    }
  })

  it('follows a redirect back to the host that issued it when no policy is set', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(307, '', { location: '/en' }))
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const result = await new HttpClient().fetch('http://localhost:3000/')

    expect(result.ok ? undefined : result.error.message).toBeUndefined()
    if (!result.ok) return
    expect(result.value.url).toBe('http://localhost:3000/en')
    expect(result.value.redirectChain).toHaveLength(1)
  })

  it.each([
    { kind: 'IPv6', start: 'http://[::1]:3000/slash', expected: 'http://[::1]:3000/slash/' },
    // new URL() rewrites [::ffff:127.0.0.1] to the hex form [::ffff:7f00:1].
    {
      kind: 'IPv4-mapped',
      start: 'http://[::ffff:127.0.0.1]:3000/slash',
      expected: 'http://[::ffff:7f00:1]:3000/slash/',
    },
  ])(
    'follows an $kind loopback self-redirect when no policy is set',
    async ({ start, expected }) => {
      // Real lookup() rejects a bracketed literal, so if the hop wrongly reaches
      // the DNS guard instead of the local-name exemption it must be refused.
      lookupMock.mockRejectedValue(new Error('ENOTFOUND'))
      mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
      mockGet.mockResolvedValueOnce(axiosResp(308, '', { location: '/slash/' }))
      mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

      const result = await new HttpClient().fetch(start)

      expect(result.ok ? undefined : result.error.message).toBeUndefined()
      if (!result.ok) return
      expect(result.value.url).toBe(expected)
      expect(result.value.redirectChain).toHaveLength(1)
      expect(lookupMock).not.toHaveBeenCalled()
    }
  )

  it('still refuses a redirect from a public host into loopback when no policy is set', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(302, '', { location: 'http://localhost:6379/' }))

    const result = await new HttpClient().fetch('https://example.com/')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('not allowed for security reasons')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('re-checks DNS on a same-host redirect hop when no policy is set', async () => {
    // The API validated attacker.example while it resolved publicly; by the
    // time its page redirects to another port on the same name, the name
    // resolves to loopback. The hop must be refused, not waved through as
    // "same host". (The no-policy client makes no lookup for the start URL,
    // so the first resolution is not mocked here.)
    lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]) // NOSONAR - intentional loopback IP
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(
      axiosResp(302, '', { location: 'https://attacker.example:6379/' })
    )
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const result = await new HttpClient().fetch('https://attacker.example/')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('resolves to a private or unreachable address')
    expect(lookupMock).toHaveBeenCalledWith('attacker.example', { all: true })
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('compares the redirect target against the host that issued it, not the start URL', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(302, '', { location: 'https://example.com/' }))
    mockGet.mockResolvedValueOnce(axiosResp(302, '', { location: 'http://localhost:3000/x' }))

    const result = await new HttpClient().fetch('http://localhost:3000/')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('not allowed for security reasons: localhost')
    expect(mockGet).toHaveBeenCalledTimes(3)
  })

  it('passes the abort signal to every request', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))
    const controller = new AbortController()

    await new HttpClient({ signal: controller.signal }).fetch('https://example.com/signal')

    for (const [, config] of mockGet.mock.calls) {
      expect((config as { signal?: AbortSignal }).signal).toBe(controller.signal)
    }
  })

  it('does not retry once the signal is aborted', async () => {
    const controller = new AbortController()
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockImplementationOnce(() => {
      controller.abort()
      return Promise.reject(new Error('canceled'))
    })

    const client = new HttpClient({ signal: controller.signal, maxRetries: 3, retryDelay: 0 })
    const result = await client.fetch('https://example.com/cancelled')

    expect(result.ok).toBe(false)
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('does not retry when the signal fires during the retry delay', async () => {
    const controller = new AbortController()
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockImplementationOnce(() => {
      setTimeout(() => controller.abort(), 0)
      return Promise.reject(new Error('ECONNRESET'))
    })

    const client = new HttpClient({ signal: controller.signal, maxRetries: 3, retryDelay: 50 })
    const result = await client.fetch('https://example.com/aborted-during-delay')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('Request aborted')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('keeps defaults for options passed as undefined (redirects are still followed)', async () => {
    mockGet.mockResolvedValueOnce(axiosResp(404, '')) // robots
    mockGet.mockResolvedValueOnce(axiosResp(301, '', { location: 'https://example.com/new' }))
    mockGet.mockResolvedValueOnce(axiosResp(200, '<html/>'))

    const client = new HttpClient({ followRedirects: undefined, timeout: undefined })
    const result = await client.fetch('https://example.com/undefined-options')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.url).toBe('https://example.com/new')
  })

  it('does not request the page once the signal has fired', async () => {
    const controller = new AbortController()
    mockGet.mockImplementationOnce(() => {
      controller.abort()
      return Promise.reject(new Error('canceled'))
    }) // robots

    const result = await new HttpClient({ signal: controller.signal }).fetch(
      'https://example.com/aborted-after-robots'
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('Request aborted')
    expect(mockGet).toHaveBeenCalledTimes(1)
  })
})
