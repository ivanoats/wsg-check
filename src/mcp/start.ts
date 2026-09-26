/**
 * Starts the MCP server over stdio: parses the server's flags and connects
 * the stdio transport. Shared by the `wsg-check-mcp` bin (`./index.ts`) and
 * `wsg-check --mcp`. This module has no side effects on import, so the CLI
 * bundle can include it without starting a server.
 *
 * stdout carries the MCP protocol, so nothing else may write to it; logs go
 * to stderr.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { Command } from 'commander'
import { WSG_SPEC } from '../config/spec/index'
import type { HostPolicy } from '../utils/host-policy'
import { VERSION } from '../version'
import { createServer } from './server'

interface McpCliOptions {
  /** `false` when `--no-local` is passed. */
  readonly local: boolean
  readonly allowPrivateNetwork?: boolean
}

const isSet = (value: string | undefined): boolean =>
  value !== undefined && value !== '' && value !== '0' && value.toLowerCase() !== 'false'

/**
 * Derives the host policy from flags and environment variables. Loopback is
 * allowed unless `--no-local` or `WSG_CHECK_NO_LOCAL` is set; private
 * networks only with `--allow-private-network` or `WSG_CHECK_ALLOW_PRIVATE`.
 *
 * Exported for testing.
 */
export const resolveHostPolicy = (
  opts: McpCliOptions,
  env: Readonly<Record<string, string | undefined>> = process.env
): HostPolicy => ({
  allowLoopback: opts.local && !isSet(env.WSG_CHECK_NO_LOCAL),
  allowPrivateNetwork: opts.allowPrivateNetwork === true || isSet(env.WSG_CHECK_ALLOW_PRIVATE),
})

/** Builds the commander program. Exported for testing. */
export const buildMcpProgram = (name = 'wsg-check-mcp'): Command =>
  new Command()
    .name(name)
    .description(
      'MCP server that checks websites against the W3C Web Sustainability Guidelines (stdio)'
    )
    .version(`${VERSION} (WSG ${WSG_SPEC.release})`)
    .option('--no-local', 'block localhost and other loopback URLs')
    .option('--allow-private-network', 'allow private network URLs (10/8, 172.16/12, 192.168/16)')

/**
 * Parses `argv` (in `process.argv` form) and serves MCP over stdio until
 * stdin closes or the process is signalled. `name` is the command shown in
 * help and errors.
 */
export const startMcpServer = async (
  argv: readonly string[],
  name = 'wsg-check-mcp'
): Promise<void> => {
  const program = buildMcpProgram(name)
  program.parse([...argv])
  const hostPolicy = resolveHostPolicy(program.opts<McpCliOptions>())

  const shutdownController = new AbortController()
  const server = createServer({ hostPolicy, shutdownSignal: shutdownController.signal })
  const transport = new StdioServerTransport()

  // Abort running checks and release stdin; the process then exits on its own.
  const shutdown = (): void => {
    shutdownController.abort()
    server.close().catch(() => undefined)
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)

  await server.connect(transport)
  process.stderr.write(
    `${name} ${VERSION} ready (local URLs ${hostPolicy.allowLoopback ? 'allowed' : 'blocked'}, ` +
      `private network ${hostPolicy.allowPrivateNetwork ? 'allowed' : 'blocked'})\n`
  )
}
