import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── HttpClient request headers (mocked axios) ────────────────────────────────

const mockGet = vi.fn()
// Records the axios.create() config so a test can pin what lives on the instance.
const mockCreate = vi.fn(() => ({ get: mockGet }))

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
    default: { create: mockCreate },
    AxiosError: MockAxiosError,
  }
})

// Mock DNS to return a public address so SSRF checks pass for test redirects
const lookupMock = vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]) // NOSONAR - intentional public IP for SSRF test
vi.mock('node:dns/promises', () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}))

const { HttpClient, requestHeaders } = await import('@/utils/http-client')

const axiosResp = (status: number, data: string, headers: Record<string, string> = {}) => ({
  status,
  data,
  headers,
})

const HEADERS = { Cookie: 's=1' } as const

/** Mocks robots.txt (404), then each given response in order. */
const queue = (...responses: ReadonlyArray<ReturnType<typeof axiosResp>>): void => {
  mockGet.mockResolvedValueOnce(axiosResp(404, ''))
  for (const r of responses) mockGet.mockResolvedValueOnce(r)
}

const callHeaders = (index: number): unknown =>
  (mockGet.mock.calls[index][1] as { headers?: unknown }).headers

describe('HttpClient request headers', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockCreate.mockClear()
    lookupMock.mockReset()
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]) // NOSONAR - intentional public IP for SSRF test
  })

  it('sends configured headers on the start request', async () => {
    queue(axiosResp(200, '<html/>'))
    const result = await new HttpClient({ headers: HEADERS }).fetch('https://example.com/')
    expect(result.ok).toBe(true)
    expect(callHeaders(1)).toEqual(HEADERS)
  })

  it('does not send configured headers to robots.txt', async () => {
    queue(axiosResp(200, '<html/>'))
    await new HttpClient({ headers: HEADERS }).fetch('https://example.com/')
    expect(mockGet.mock.calls[0][0]).toBe('https://example.com/robots.txt')
    expect(callHeaders(0)).toBeUndefined()
  })

  it('sends headers on a same-hostname redirect hop', async () => {
    queue(
      axiosResp(307, '', { location: 'https://example.com:8443/en' }),
      axiosResp(200, '<html/>')
    )
    const result = await new HttpClient({ headers: HEADERS }).fetch('https://example.com/')
    expect(callHeaders(1)).toEqual(HEADERS)
    expect(callHeaders(2)).toEqual(HEADERS)
    expect(result.ok && result.value.url).toBe('https://example.com:8443/en')
  })

  it('does not send headers on a cross-hostname redirect hop', async () => {
    queue(axiosResp(302, '', { location: 'https://cdn.example.net/en' }), axiosResp(200, '<html/>'))
    const result = await new HttpClient({ headers: HEADERS }).fetch('https://example.com/')
    expect(callHeaders(1)).toEqual(HEADERS)
    expect(mockGet.mock.calls[2][0]).toBe('https://cdn.example.net/en')
    expect(callHeaders(2)).toBeUndefined()
    expect(result.ok).toBe(true)
  })

  it('does not send headers on an https -> http downgrade hop on the same host', async () => {
    queue(axiosResp(302, '', { location: 'http://example.com/en' }), axiosResp(200, '<html/>'))
    const result = await new HttpClient({ headers: HEADERS }).fetch('https://example.com/')
    expect(callHeaders(1)).toEqual(HEADERS)
    expect(callHeaders(2)).toBeUndefined()
    expect(result.ok && result.value.url).toBe('http://example.com/en')
  })

  it('does not send headers on a plaintext hop after the chain has used https (http -> https -> http)', async () => {
    queue(
      axiosResp(302, '', { location: 'https://example.com/secure' }),
      axiosResp(302, '', { location: 'http://example.com/final' }),
      axiosResp(200, '<html/>')
    )
    const result = await new HttpClient({ headers: HEADERS }).fetch('http://example.com/')
    expect(callHeaders(1)).toEqual(HEADERS)
    expect(callHeaders(2)).toEqual(HEADERS)
    expect(callHeaders(3)).toBeUndefined()
    expect(result.ok && result.value.url).toBe('http://example.com/final')
  })

  it('keeps headers off every plaintext hop after a downgrade, not only the first (https -> http -> http)', async () => {
    queue(
      axiosResp(302, '', { location: 'http://example.com/a' }),
      axiosResp(302, '', { location: 'http://example.com/b' }),
      axiosResp(200, '<html/>')
    )
    await new HttpClient({ headers: HEADERS }).fetch('https://example.com/')
    expect(callHeaders(1)).toEqual(HEADERS)
    expect(callHeaders(2)).toBeUndefined()
    expect(callHeaders(3)).toBeUndefined()
  })

  it('sends headers again on a same-host https hop that follows a plaintext hop (https -> http -> https)', async () => {
    queue(
      axiosResp(302, '', { location: 'http://example.com/plain' }),
      axiosResp(302, '', { location: 'https://example.com/secure' }),
      axiosResp(200, '<html/>')
    )
    await new HttpClient({ headers: HEADERS }).fetch('https://example.com/')
    expect(callHeaders(2)).toBeUndefined()
    expect(callHeaders(3)).toEqual(HEADERS)
  })

  it('leaves the instance User-Agent in place when headers are set', () => {
    expect(() => new HttpClient({ headers: HEADERS })).not.toThrow()
    const config = (mockCreate.mock.calls[0] as unknown[])[0] as { headers: unknown }
    expect(config.headers).toEqual({ 'User-Agent': expect.stringContaining('wsg-check/') })
  })

  it('requestHeaders returns nothing for an empty record, so axios gets no headers key', () => {
    expect(requestHeaders({}, 'https://example.com/', 'https://example.com/', [])).toEqual({})
    expect(requestHeaders(HEADERS, 'http://example.com/', 'https://example.com/', [])).toEqual({
      headers: HEADERS,
    })
  })
})
