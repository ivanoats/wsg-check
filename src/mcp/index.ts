/**
 * Entry point for the `wsg-check-mcp` command: an MCP server over stdio.
 *
 * Usage (in an MCP client's server configuration):
 *   npx -y -p @sustainablewebsites/wsg-check wsg-check-mcp [--no-local] [--allow-private-network]
 *
 * `npx -y @sustainablewebsites/wsg-check --mcp` starts the same server
 * through the `wsg-check` bin; the MCP Registry listing (server.json) uses
 * that form.
 */

import { isEntryPoint } from '../utils/entry-point'
import { startMcpServer } from './start'

export { buildMcpProgram, resolveHostPolicy, startMcpServer } from './start'

if (isEntryPoint(import.meta.url, process.argv[1])) {
  try {
    await startMcpServer(process.argv)
  } catch (error: unknown) {
    process.stderr.write(
      `wsg-check-mcp failed to start: ${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exitCode = 1
  }
}
