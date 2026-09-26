/**
 * Builds the wsg-check MCP server. Pure setup: it registers tools but opens
 * no transport, so tests can connect it to an in-memory client.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WSG_SPEC } from '../config/spec/index'
import type { HostPolicy } from '../utils/host-policy'
import { VERSION } from '../version'
import { checkUrlInputSchema, checkUrlOutputSchema, handleCheckUrl } from './check-url'
import {
  getGuidelineInputSchema,
  getGuidelineOutputSchema,
  handleGetGuideline,
  handleListGuidelines,
  listGuidelinesInputSchema,
  listGuidelinesOutputSchema,
} from './guidelines'

export interface ServerOptions {
  /** Which local and private targets `check_url` may fetch. */
  readonly hostPolicy: HostPolicy
  /** Aborts running checks when the server shuts down. */
  readonly shutdownSignal?: AbortSignal
}

const INSTRUCTIONS =
  `Checks web pages against the W3C Web Sustainability Guidelines (WSG ${WSG_SPEC.release}). ` +
  'Use check_url on a deployed site or a local dev server (e.g. http://localhost:3000). ' +
  'Results come from static analysis of the HTML and HTTP headers; treat scores as guidance. ' +
  'Use list_guidelines and get_guideline to look up what a guideline asks for and how to meet it.'

export const createServer = ({ hostPolicy, shutdownSignal }: ServerOptions): McpServer => {
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
        "Local URLs such as http://localhost:3000 are fetched from the user's machine; they work " +
        'unless the server was started with --no-local.',
      inputSchema: checkUrlInputSchema,
      outputSchema: checkUrlOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (input, extra) => handleCheckUrl(input, extra, { hostPolicy, shutdownSignal })
  )

  server.registerTool(
    'list_guidelines',
    {
      title: 'List WSG guidelines',
      description:
        `Lists the guidelines in WSG ${WSG_SPEC.release}, optionally filtered by category, ` +
        'testability, or text in the title, slug, or description. Each entry has the slug to pass to get_guideline ' +
        "or to check_url's guidelines, and how many automated checks implement it.",
      inputSchema: listGuidelinesInputSchema,
      outputSchema: listGuidelinesOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (input) => handleListGuidelines(input)
  )

  server.registerTool(
    'get_guideline',
    {
      title: 'Get a WSG guideline',
      description:
        'Returns one guideline: its description, category, testability, W3C specification ' +
        'link, and how many automated checks implement it. Accepts a slug, or a deprecated ' +
        'numeric ID such as "3.3", which is resolved to its current slug.',
      inputSchema: getGuidelineInputSchema,
      outputSchema: getGuidelineOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (input) => handleGetGuideline(input)
  )

  return server
}
