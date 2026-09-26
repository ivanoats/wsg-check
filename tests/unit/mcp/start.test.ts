// @vitest-environment node
/**
 * Tests for startMcpServer: flag parsing, the ready message, and shutdown on
 * SIGINT/SIGTERM. The stdio transport and the server are mocked, so nothing
 * reads stdin or writes to stdout.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { HostPolicy } from '@/utils/host-policy'

const connect = vi.fn().mockResolvedValue(undefined)
const close = vi.fn().mockResolvedValue(undefined)
type ServerOptions = { hostPolicy: HostPolicy; shutdownSignal: AbortSignal }
const createServerMock = vi.fn<
  (options: ServerOptions) => { connect: typeof connect; close: typeof close }
>(() => ({ connect, close }))
vi.mock('@/mcp/server', () => ({ createServer: createServerMock }))

class MockStdioServerTransport {}
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: MockStdioServerTransport,
}))

const { startMcpServer } = await import('@/mcp/start')

type Handler = () => void

let handlers: Map<string, Handler>
let stderr: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  handlers = new Map()
  vi.spyOn(process, 'once').mockImplementation(((event: string, handler: Handler) => {
    handlers.set(event, handler)
    return process
  }) as typeof process.once)
  stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
  vi.stubEnv('WSG_CHECK_NO_LOCAL', '')
  vi.stubEnv('WSG_CHECK_ALLOW_PRIVATE', '')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

const options = () => createServerMock.mock.calls[0][0]

describe('startMcpServer', () => {
  it('connects the stdio transport and reports the default host policy', async () => {
    await startMcpServer(['node', 'wsg-check-mcp'])

    expect(options().hostPolicy).toEqual({ allowLoopback: true, allowPrivateNetwork: false })
    expect(connect).toHaveBeenCalledWith(expect.any(MockStdioServerTransport))
    expect(stderr).toHaveBeenCalledWith(
      expect.stringMatching(
        /^wsg-check-mcp \S+ ready \(local URLs allowed, private network blocked\)/u
      )
    )
  })

  it('applies the flags and names the command in the ready message', async () => {
    await startMcpServer(
      ['node', 'wsg-check', '--no-local', '--allow-private-network'],
      'wsg-check --mcp'
    )

    expect(options().hostPolicy).toEqual({ allowLoopback: false, allowPrivateNetwork: true })
    expect(stderr).toHaveBeenCalledWith(
      expect.stringMatching(
        /^wsg-check --mcp \S+ ready \(local URLs blocked, private network allowed\)/u
      )
    )
  })

  it.each(['SIGINT', 'SIGTERM'])(
    'aborts running checks and closes the server on %s',
    async (signal) => {
      await startMcpServer(['node', 'wsg-check-mcp'])
      const { shutdownSignal } = options()

      expect(shutdownSignal.aborted).toBe(false)
      handlers.get(signal)?.()

      expect(shutdownSignal.aborted).toBe(true)
      expect(close).toHaveBeenCalledOnce()
    }
  )
})
