/**
 * Entry point for the `wsg-check-mcp` command: an MCP server over stdio.
 *
 * Usage (in an MCP client's server configuration):
 *   npx -y -p @sustainablewebsites/wsg-check wsg-check-mcp [--no-local] [--allow-private-network]
 *
 * stdout carries the MCP protocol, so nothing else may write to it; logs go
 * to stderr.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { Command } from 'commander'
import { WSG_SPEC } from '../config/spec/index'
import { isEntryPoint } from '../utils/entry-point'
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
export const buildMcpProgram = (): Command =>
  new Command()
    .name('wsg-check-mcp')
    .description(
      'MCP server that checks websites against the W3C Web Sustainability Guidelines (stdio)'
    )
    .version(`${VERSION} (WSG ${WSG_SPEC.release})`)
    .option('--no-local', 'block localhost and other loopback URLs')
    .option('--allow-private-network', 'allow private network URLs (10/8, 172.16/12, 192.168/16)')

const main = async (): Promise<void> => {
  const program = buildMcpProgram()
  program.parse(process.argv)
  const hostPolicy = resolveHostPolicy(program.opts<McpCliOptions>())

  const server = createServer({ hostPolicy })
  const transport = new StdioServerTransport()

  const shutdown = (): void => {
    server
      .close()
      .catch(() => undefined)
      .finally(() => process.exit(0))
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)

  await server.connect(transport)
  process.stderr.write(
    `wsg-check-mcp ${VERSION} ready (local URLs ${hostPolicy.allowLoopback ? 'allowed' : 'blocked'}, ` +
      `private network ${hostPolicy.allowPrivateNetwork ? 'allowed' : 'blocked'})\n`
  )
}

if (isEntryPoint(import.meta.url, process.argv[1])) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `wsg-check-mcp failed to start: ${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exitCode = 1
  })
}
