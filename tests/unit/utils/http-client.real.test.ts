// @vitest-environment node
// Node environment: under jsdom axios uses the XHR adapter and ignores the `lookup` option.
import { describe, it, expect, afterEach } from 'vitest'
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { HttpClient } from '@/utils/http-client'

interface Seen {
  readonly url: string | undefined
  readonly headers: IncomingHttpHeaders
}

const ROUTES: Readonly<
  Record<string, { status: number; headers: Record<string, string>; body: string }>
> = {
  '/robots.txt': { status: 200, headers: {}, body: 'User-agent: *\nAllow: /' },
  '/': { status: 307, headers: { Location: '/en' }, body: '' },
  '/en': { status: 200, headers: { 'Content-Type': 'text/html' }, body: '<html/>' },
}

let server: Server | undefined

/** Starts a loopback server that records every request it receives. */
const startServer = async (seen: Seen[]): Promise<string> => {
  server = createServer((req, res) => {
    seen.push({ url: req.url, headers: req.headers })
    const route = ROUTES[req.url ?? ''] ?? { status: 404, headers: {}, body: '' }
    res.writeHead(route.status, route.headers).end(route.body)
  })
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()))
  server = undefined
})

describe('HttpClient request headers over a real socket', () => {
  it('a real server receives the header on the start request and the same-host hop, not on robots.txt', async () => {
    const seen: Seen[] = []
    const base = await startServer(seen)
    const client = new HttpClient({
      headers: { Cookie: 's=1' },
      hostPolicy: { allowLoopback: true, allowPrivateNetwork: false },
      maxRetries: 0,
      timeout: 5_000,
    })

    const result = await client.fetch(`${base}/`)

    expect(result.ok && result.value.url).toBe(`${base}/en`)
    expect(seen.map((s) => [s.url, s.headers.cookie])).toEqual([
      ['/robots.txt', undefined],
      ['/', 's=1'],
      ['/en', 's=1'],
    ])
    // Per-request headers merge over the instance User-Agent rather than replacing it.
    for (const s of seen) expect(s.headers['user-agent']).toContain('wsg-check')
  })
})
