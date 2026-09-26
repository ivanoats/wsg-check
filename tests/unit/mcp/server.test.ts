// @vitest-environment node
/**
 * MCP server tests: a real MCP client talks to the server over the SDK's
 * in-memory transport. The client validates structuredContent against each
 * tool's outputSchema, so successful calls also prove schema conformance.
 * Only the network (axios, DNS, Green Web Foundation) is mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

// ─── Network mocks ────────────────────────────────────────────────────────────

const mockGet = vi.fn()

vi.mock('axios', () => {
  class MockAxiosError extends Error {
    response?: { status: number }
  }
  return {
    default: { create: () => ({ get: mockGet }) },
    AxiosError: MockAxiosError,
  }
})

const lookupMock = vi.fn()
vi.mock('node:dns/promises', () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}))

const greenHostingMock = vi.fn().mockResolvedValue(false)
vi.mock('@tgwf/co2', () => ({
  co2: function MockCO2() {
    return { perByte: () => 0.0042 }
  },
  hosting: greenHostingMock,
}))

const { createServer } = await import('@/mcp/server')
const { resolveHostPolicy, buildMcpProgram } = await import('@/mcp/index')

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Test page</title>
</head>
<body>
  <main><h1>Hello</h1><img src="/photo.jpg"></main>
</body>
</html>`

const DEFAULT_POLICY = { allowLoopback: true, allowPrivateNetwork: false }

type GetConfig = { signal?: AbortSignal }

/** Serves robots.txt and PAGE; `/` on localhost:3000 redirects to `/en`. */
const servePage = (): void => {
  mockGet.mockImplementation((url: string) => {
    if (url.endsWith('/robots.txt')) {
      return Promise.resolve({ status: 404, data: '', headers: {} })
    }
    if (url === 'http://localhost:3000/') {
      return Promise.resolve({ status: 307, data: '', headers: { location: '/en' } })
    }
    return Promise.resolve({
      status: 200,
      data: PAGE,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'content-length': String(PAGE.length),
      },
    })
  })
}

/** A request that only settles when its abort signal fires. */
const hangUntilAborted = (): void => {
  mockGet.mockImplementation(
    (_url: string, config: GetConfig = {}) =>
      new Promise((_resolve, reject) => {
        if (config.signal?.aborted) reject(new Error('canceled'))
        config.signal?.addEventListener('abort', () => reject(new Error('canceled')))
      })
  )
}

const connect = async (policy = DEFAULT_POLICY): Promise<Client> => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = createServer({ hostPolicy: policy })
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

const callCheckUrl = async (
  client: Client,
  args: Record<string, unknown>,
  options?: Parameters<Client['callTool']>[2]
): Promise<CallToolResult> =>
  (await client.callTool(
    { name: 'check_url', arguments: args },
    undefined,
    options
  )) as CallToolResult

const textOf = (result: CallToolResult): string =>
  result.content.map((part) => (part.type === 'text' ? part.text : '')).join('\n')

type Summary = {
  url: string
  finalUrl: string
  grade: string
  overallScore: number
  issues: Array<{ related: boolean; impact: string; status: string; guidelineName: string }>
  notices: string[]
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('wsg-check MCP server', () => {
  let client: Client

  beforeEach(async () => {
    mockGet.mockReset()
    lookupMock.mockReset()
    lookupMock.mockImplementation((host: string) =>
      Promise.resolve(
        host === 'localhost'
          ? [{ address: '127.0.0.1', family: 4 }]
          : [{ address: '93.184.216.34', family: 4 }] // NOSONAR - intentional public IP
      )
    )
    greenHostingMock.mockClear()
    client = await connect()
  })

  afterEach(async () => {
    await client.close()
  })

  it('lists check_url with its schemas and read-only annotations', async () => {
    const { tools } = await client.listTools()
    const tool = tools.find((t) => t.name === 'check_url')

    expect(tool).toBeDefined()
    expect(tool?.inputSchema.required).toEqual(['url'])
    expect(tool?.outputSchema?.properties).toHaveProperty('summary')
    expect(tool?.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: true })
  })

  it('returns a schema-valid summary with issues sorted WSG-first by impact', async () => {
    servePage()
    const result = await callCheckUrl(client, { url: 'https://example.com/' })

    expect(result.isError).toBeFalsy()
    const { detail, summary, report } = result.structuredContent as {
      detail: string
      summary: Summary
      report?: unknown
    }
    expect(detail).toBe('summary')
    expect(report).toBeUndefined()
    expect(summary.finalUrl).toBe('https://example.com/')
    expect(summary.grade).toMatch(/^[A-F]$/u)
    expect(summary.issues.length).toBeGreaterThan(0)

    const rank = { high: 0, medium: 1, low: 2 } as Record<string, number>
    const keys = summary.issues.map((i) => [Number(i.related), rank[i.impact]])
    const sorted = [...keys].sort((a, b) => a[0] - b[0] || a[1] - b[1])
    expect(keys).toEqual(sorted)

    expect(textOf(result)).toContain('# WSG check: https://example.com/')
  })

  it('includes the full report when detail is "full"', async () => {
    servePage()
    const result = await callCheckUrl(client, { url: 'https://example.com/', detail: 'full' })

    const { report } = result.structuredContent as { report: { checks: unknown[] } }
    expect(report.checks.length).toBeGreaterThan(0)
    expect(textOf(result)).toContain('Sustainability Report')
  })

  it('checks a local dev server, following its redirect and skipping the hosting lookup', async () => {
    servePage()
    const result = await callCheckUrl(client, { url: 'http://localhost:3000/' })

    expect(result.isError).toBeFalsy()
    const { summary } = result.structuredContent as { summary: Summary }
    expect(summary.url).toBe('http://localhost:3000/')
    expect(summary.finalUrl).toBe('http://localhost:3000/en')
    expect(summary.issues.map((i) => i.guidelineName)).not.toContain(
      'Choose a Sustainable Hosting Provider'
    )
    expect(greenHostingMock).not.toHaveBeenCalled()
  })

  it('sends progress notifications when the client asks for them', async () => {
    servePage()
    const progress: Array<{ progress: number; total?: number; message?: string }> = []

    await callCheckUrl(
      client,
      { url: 'https://example.com/' },
      { onprogress: (p) => progress.push(p) }
    )

    expect(progress.map((p) => p.progress)).toEqual([1, 2, 3])
    expect(progress.every((p) => p.total === 3)).toBe(true)
    expect(progress[0]?.message).toBe('Fetching the page')
  })

  it('reports deprecated guideline IDs as notices', async () => {
    servePage()
    const result = await callCheckUrl(client, { url: 'https://example.com/', guidelines: ['3.3'] })

    const { summary } = result.structuredContent as { summary: Summary }
    expect(summary.notices).toEqual([
      expect.stringContaining('numeric guideline ID "3.3" is deprecated'),
    ])
  })

  it('returns an error result when no checks match', async () => {
    const result = await callCheckUrl(client, {
      url: 'https://example.com/',
      guidelines: ['no-such-guideline'],
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('No checks match')
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('returns an error result for unreachable pages', async () => {
    mockGet.mockRejectedValue(new Error('connect ECONNREFUSED'))
    const result = await callCheckUrl(client, { url: 'https://example.com/', timeoutMs: 5_000 })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('ECONNREFUSED')
  })

  it('rejects non-HTTP URLs through input validation', async () => {
    const result = await callCheckUrl(client, { url: 'file:///etc/passwd' })
    expect(result.isError).toBe(true)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('blocks private network URLs by default and names the flag that allows them', async () => {
    lookupMock.mockResolvedValue([{ address: '192.168.1.10', family: 4 }]) // NOSONAR - intentional private IP
    const result = await callCheckUrl(client, { url: 'http://nas.example/' })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('--allow-private-network')
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('blocks local URLs when started with --no-local and says how to allow them', async () => {
    const strict = await connect({ allowLoopback: false, allowPrivateNetwork: false })
    const result = await callCheckUrl(strict, { url: 'http://localhost:3000/' })
    await strict.close()

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('--no-local')
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('times out and aborts the fetch', async () => {
    hangUntilAborted()
    const result = await callCheckUrl(client, { url: 'https://example.com/', timeoutMs: 1_000 })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('timed out after 1000 ms')
  })

  it('aborts the fetch when the client cancels the request', async () => {
    hangUntilAborted()
    const controller = new AbortController()
    const call = callCheckUrl(
      client,
      { url: 'https://example.com/' },
      { signal: controller.signal }
    )

    await vi.waitFor(() => expect(mockGet).toHaveBeenCalled())
    controller.abort()

    await expect(call).rejects.toThrow()
    const config = mockGet.mock.calls[0]?.[1] as GetConfig
    await vi.waitFor(() => expect(config.signal?.aborted).toBe(true))
  })
})

describe('wsg-check-mcp command line', () => {
  it('allows loopback and blocks private networks by default', () => {
    expect(resolveHostPolicy({ local: true }, {})).toEqual({
      allowLoopback: true,
      allowPrivateNetwork: false,
    })
  })

  it('applies --no-local and --allow-private-network', () => {
    const program = buildMcpProgram()
    program.parse(['node', 'wsg-check-mcp', '--no-local', '--allow-private-network'])
    expect(resolveHostPolicy(program.opts(), {})).toEqual({
      allowLoopback: false,
      allowPrivateNetwork: true,
    })
  })

  it('reads WSG_CHECK_NO_LOCAL and WSG_CHECK_ALLOW_PRIVATE', () => {
    expect(
      resolveHostPolicy(
        { local: true },
        { WSG_CHECK_NO_LOCAL: '1', WSG_CHECK_ALLOW_PRIVATE: 'true' }
      )
    ).toEqual({ allowLoopback: false, allowPrivateNetwork: true })
    expect(resolveHostPolicy({ local: true }, { WSG_CHECK_NO_LOCAL: '0' }).allowLoopback).toBe(true)
  })
})
