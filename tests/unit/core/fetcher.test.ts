import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FetchError, ParseError } from '@/utils/errors'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockClientFetch = vi.fn()
const mockClearCache = vi.fn()

vi.mock('@/utils/http-client', () => {
  function MockHttpClient() {
    // @ts-expect-error – assigning to `this` in a plain constructor mock
    this.fetch = mockClientFetch
    // @ts-expect-error – same reason; plain constructor mock
    this.clearCache = mockClearCache
  }
  return { HttpClient: MockHttpClient }
})

const mockParseHtml = vi.fn()
vi.mock('@/utils/html-parser', () => ({
  parseHtml: mockParseHtml,
}))

const mockAnalyzePageWeight = vi.fn()
vi.mock('@/utils/resource-analyzer', () => ({
  analyzePageWeight: mockAnalyzePageWeight,
}))

// Import after vi.mock so mocks are in place
const { PageFetcher } = await import('@/core/fetcher')

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FETCH_RESULT = {
  url: 'https://example.com/',
  originalUrl: 'https://example.com/',
  statusCode: 200,
  headers: { 'content-type': 'text/html' },
  body: '<html><head><title>Test</title></head><body></body></html>',
  redirectChain: [],
  fromCache: false,
  contentLength: 54,
}

const PARSED_PAGE = {
  title: 'Test',
  lang: 'en',
  metaTags: [],
  links: [],
  resources: [],
  headings: [],
  hasSkipLink: false,
  landmarks: [],
  ariaAttributes: [],
  structuredData: [],
  doctype: '<!DOCTYPE html>',
}

const PAGE_WEIGHT = {
  htmlSize: 54,
  resourceCount: 0,
  firstPartyCount: 0,
  thirdPartyCount: 0,
  compression: { isCompressed: false },
  byType: { stylesheet: 0, script: 0, image: 0, font: 0, media: 0, other: 0 },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PageFetcher', () => {
  beforeEach(() => {
    mockClientFetch.mockReset()
    mockClearCache.mockReset()
    mockParseHtml.mockReset()
    mockAnalyzePageWeight.mockReset()
  })

  it('constructs without options', () => {
    const fetcher = new PageFetcher()
    expect(fetcher).toBeInstanceOf(PageFetcher)
  })

  it('returns ok PageData on a successful fetch', async () => {
    mockClientFetch.mockResolvedValueOnce({ ok: true, value: FETCH_RESULT })
    mockParseHtml.mockReturnValueOnce(PARSED_PAGE)
    mockAnalyzePageWeight.mockReturnValueOnce(PAGE_WEIGHT)

    const fetcher = new PageFetcher()
    const result = await fetcher.fetch('https://example.com/')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.url).toBe('https://example.com/')
    expect(result.value.fetchResult).toBe(FETCH_RESULT)
    expect(result.value.parsedPage).toBe(PARSED_PAGE)
    expect(result.value.pageWeight).toBe(PAGE_WEIGHT)
  })

  it('passes ignoreRobots option to the HTTP client', async () => {
    mockClientFetch.mockResolvedValueOnce({ ok: true, value: FETCH_RESULT })
    mockParseHtml.mockReturnValueOnce(PARSED_PAGE)
    mockAnalyzePageWeight.mockReturnValueOnce(PAGE_WEIGHT)

    const fetcher = new PageFetcher()
    await fetcher.fetch('https://example.com/', { ignoreRobots: true })

    expect(mockClientFetch).toHaveBeenCalledWith('https://example.com/', { ignoreRobots: true })
  })

  it('propagates a FetchError from the HTTP client', async () => {
    const fetchError = new FetchError('Network error', 'https://example.com/')
    mockClientFetch.mockResolvedValueOnce({ ok: false, error: fetchError })

    const fetcher = new PageFetcher()
    const result = await fetcher.fetch('https://example.com/')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBeInstanceOf(FetchError)
    expect(result.error.message).toBe('Network error')
  })

  it('wraps a ParseError thrown by parseHtml', async () => {
    mockClientFetch.mockResolvedValueOnce({ ok: true, value: FETCH_RESULT })
    mockParseHtml.mockImplementationOnce(() => {
      throw new ParseError('Bad HTML')
    })

    const fetcher = new PageFetcher()
    const result = await fetcher.fetch('https://example.com/')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBeInstanceOf(ParseError)
    expect(result.error.message).toBe('Bad HTML')
  })

  it('wraps an unexpected error from parseHtml in a ParseError', async () => {
    mockClientFetch.mockResolvedValueOnce({ ok: true, value: FETCH_RESULT })
    mockParseHtml.mockImplementationOnce(() => {
      throw new Error('Unexpected failure')
    })

    const fetcher = new PageFetcher()
    const result = await fetcher.fetch('https://example.com/')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBeInstanceOf(ParseError)
    expect(result.error.message).toBe('Failed to parse HTML')
  })

  it('calls analyzePageWeight with fetchResult and parsedPage', async () => {
    mockClientFetch.mockResolvedValueOnce({ ok: true, value: FETCH_RESULT })
    mockParseHtml.mockReturnValueOnce(PARSED_PAGE)
    mockAnalyzePageWeight.mockReturnValueOnce(PAGE_WEIGHT)

    const fetcher = new PageFetcher()
    await fetcher.fetch('https://example.com/')

    expect(mockAnalyzePageWeight).toHaveBeenCalledWith(
      FETCH_RESULT,
      PARSED_PAGE,
      'https://example.com/'
    )
  })

  it('clearCache delegates to the underlying HttpClient', () => {
    const fetcher = new PageFetcher()
    fetcher.clearCache()
    expect(mockClearCache).toHaveBeenCalledOnce()
  })

  it('constructs with custom HttpClientOptions', () => {
    const fetcher = new PageFetcher({ timeout: 5_000, userAgent: 'test-bot/1.0' })
    expect(fetcher).toBeInstanceOf(PageFetcher)
  })
})

// ─── Integration-style: CheckResult shape ─────────────────────────────────────

describe('PageFetcher — result shape', () => {
  it('returned PageData contains all expected fields', async () => {
    mockClientFetch.mockResolvedValueOnce({ ok: true, value: FETCH_RESULT })
    mockParseHtml.mockReturnValueOnce(PARSED_PAGE)
    mockAnalyzePageWeight.mockReturnValueOnce(PAGE_WEIGHT)

    const fetcher = new PageFetcher()
    const result = await fetcher.fetch('https://example.com/')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const keys: (keyof typeof result.value)[] = ['url', 'fetchResult', 'parsedPage', 'pageWeight']
    for (const key of keys) {
      expect(result.value).toHaveProperty(key)
    }
  })
})
