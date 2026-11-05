// @vitest-environment node
/**
 * Uses a real server and un-mocked axios: the mocked tests inject
 * `content-encoding` directly, so they can't see axios strip it.
 * Needs the node environment; under jsdom axios uses XHR, which has no raw headers.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import zlib from 'node:zlib'
import { HttpClient } from '@/utils/http-client'

const HTML = `<!DOCTYPE html><html lang="en"><head><title>t</title></head><body>${'<p>hello</p>'.repeat(40)}</body></html>`
const GZIPPED = zlib.gzipSync(HTML)
const BROTLI = zlib.brotliCompressSync(HTML)

const send = (res: http.ServerResponse, body: Buffer | string, encoding?: string): void => {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...(encoding ? { 'Content-Encoding': encoding } : {}),
  })
  res.end(body)
}

const server = http.createServer((req, res) => {
  if (req.url === '/gzip') send(res, GZIPPED, 'gzip')
  else if (req.url === '/br') send(res, BROTLI, 'br')
  else if (req.url === '/plain') send(res, HTML)
  else res.writeHead(404).end()
})

let baseUrl = ''

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('HttpClient against a real compressing server', () => {
  it('keeps Content-Encoding: gzip and returns the decompressed body', async () => {
    const result = await new HttpClient({ maxRetries: 0 }).fetch(`${baseUrl}/gzip`)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.headers['content-encoding']).toBe('gzip')
    expect(result.value.contentEncoding).toBe('gzip')
    expect(result.value.body).toBe(HTML)
    // Content-Length is the compressed transfer size; axios does not strip it.
    expect(result.value.contentLength).toBe(GZIPPED.length)
  })

  it('keeps Content-Encoding: br', async () => {
    const result = await new HttpClient({ maxRetries: 0 }).fetch(`${baseUrl}/br`)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.contentEncoding).toBe('br')
    expect(result.value.body).toBe(HTML)
  })

  it('reports no encoding when the server sent none', async () => {
    const result = await new HttpClient({ maxRetries: 0 }).fetch(`${baseUrl}/plain`)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.contentEncoding).toBeUndefined()
    expect(result.value.headers['content-encoding']).toBeUndefined()
  })
})
