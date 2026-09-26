/**
 * Builds the wsg-check MCP server. Pure setup: it registers tools but opens
 * no transport, so tests can connect it to an in-memory client.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WSG_SPEC } from '../config/spec/index'
import type { HostPolicy } from '../utils/host-policy'
import { VERSION } from '../version'
import { checkUrlInputSchema, checkUrlOutputSchema, handleCheckUrl } from './check-url'

export interface ServerOptions {
  /** Which local and private targets `check_url` may fetch. */
  readonly hostPolicy: HostPolicy
}

const INSTRUCTIONS =
  `Checks web pages against the W3C Web Sustainability Guidelines (WSG ${WSG_SPEC.release}). ` +
  'Use check_url on a deployed site or a local dev server (e.g. http://localhost:3000). ' +
  'Results come from static analysis of the HTML and HTTP headers; treat scores as guidance.'

export const createServer = ({ hostPolicy }: ServerOptions): McpServer => {
  const server = new McpServer(
    { name: 'wsg-check', title: 'WSG Check', version: VERSION },
    { instructions: INSTRUCTIONS }
  )

  server.registerTool(
    'check_url',
    {
      title: 'Check a URL against the WSG',
      description:
        'Fetches a page and checks it against the W3C Web Sustainability Guidelines. ' +
        'Returns the score, grade, and each failed or warned check with a recommended fix. ' +
        'Local URLs such as http://localhost:3000 work unless the server was started with --no-local.',
      inputSchema: checkUrlInputSchema,
      outputSchema: checkUrlOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (input, extra) => handleCheckUrl(input, extra, { hostPolicy })
  )

  return server
}
