// @vitest-environment node
/**
 * Tests for the list_guidelines and get_guideline MCP tools, through a real
 * MCP client over the SDK's in-memory transport. The client validates
 * structuredContent against each tool's outputSchema. These tools make no
 * network requests, so nothing is mocked.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { createServer } from '@/mcp/server'
import { GUIDELINES_REGISTRY } from '@/config/guidelines-registry'
import { WSG_SPEC } from '@/config/spec/index'

type Summary = {
  id: string
  number: string
  title: string
  category: string
  testability: string
  automatedChecks: number
}

type Listing = { spec: { release: string }; count: number; guidelines: Summary[] }

type Detail = {
  guideline: Summary & { description: string; specUrl: string; legacyIds: string[] }
  notices: string[]
}

let client: Client

beforeAll(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = createServer({ hostPolicy: { allowLoopback: true, allowPrivateNetwork: false } })
  client = new Client({ name: 'test-client', version: '1.0.0' })
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
})

afterAll(async () => {
  await client.close()
})

const call = async (name: string, args: Record<string, unknown>): Promise<CallToolResult> =>
  (await client.callTool({ name, arguments: args })) as CallToolResult

const textOf = (result: CallToolResult): string =>
  result.content.map((part) => (part.type === 'text' ? part.text : '')).join('\n')

describe('tool listing', () => {
  it('lists all three tools, the guideline tools as closed-world and read-only', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual([
      'check_url',
      'get_guideline',
      'list_guidelines',
    ])
    for (const name of ['list_guidelines', 'get_guideline']) {
      expect(tools.find((t) => t.name === name)?.annotations).toMatchObject({
        readOnlyHint: true,
        openWorldHint: false,
      })
    }
  })
})

describe('list_guidelines', () => {
  it('lists every guideline in the targeted release by default', async () => {
    const result = await call('list_guidelines', {})
    const listing = result.structuredContent as Listing

    expect(result.isError).toBeFalsy()
    expect(listing.spec.release).toBe(WSG_SPEC.release)
    expect(listing.count).toBe(GUIDELINES_REGISTRY.length)
    expect(listing.guidelines).toHaveLength(GUIDELINES_REGISTRY.length)
    expect(textOf(result)).toContain(`# WSG ${WSG_SPEC.release} guidelines`)
  })

  it('counts the automated checks that implement each guideline', async () => {
    const { guidelines } = (await call('list_guidelines', {})).structuredContent as Listing
    const minify = guidelines.find((g) => g.id === 'minify-and-remove-unused-code')

    expect(minify?.automatedChecks).toBeGreaterThan(0)
    expect(guidelines.some((g) => g.automatedChecks === 0)).toBe(true)
  })

  it('filters by category and testability together', async () => {
    const result = await call('list_guidelines', { category: 'ux', testability: 'automated' })
    const { guidelines, count } = result.structuredContent as Listing

    const expected = GUIDELINES_REGISTRY.filter(
      (g) => g.category === 'ux' && g.testability === 'automated'
    )
    expect(count).toBe(expected.length)
    expect(guidelines.every((g) => g.category === 'ux' && g.testability === 'automated')).toBe(true)
  })

  it('matches the query case-insensitively against titles and slugs', async () => {
    const byTitle = (await call('list_guidelines', { query: 'MINIFY' }))
      .structuredContent as Listing
    const bySlug = (await call('list_guidelines', { query: 'unused-code' }))
      .structuredContent as Listing

    expect(byTitle.guidelines.map((g) => g.id)).toContain('minify-and-remove-unused-code')
    expect(bySlug.guidelines.map((g) => g.id)).toEqual(['minify-and-remove-unused-code'])
  })

  it('also matches the description, so a search for "font" finds web typography', async () => {
    const { guidelines } = (await call('list_guidelines', { query: 'font' }))
      .structuredContent as Listing

    expect(guidelines.map((g) => g.id)).toContain('use-optimized-web-typography')
  })

  it('says so when nothing matches', async () => {
    const result = await call('list_guidelines', { query: 'no guideline has this title' })

    expect((result.structuredContent as Listing).count).toBe(0)
    expect(textOf(result)).toContain('No guidelines match.')
  })

  it('rejects an unknown category through input validation', async () => {
    const result = await call('list_guidelines', { category: 'marketing' })
    expect(result.isError).toBe(true)
  })
})

describe('get_guideline', () => {
  it('returns a guideline by slug, with its legacy IDs and no notices', async () => {
    const result = await call('get_guideline', { id: 'optimize-media-to-reduce-resource-use' })
    const { guideline, notices } = result.structuredContent as Detail

    expect(result.isError).toBeFalsy()
    expect(guideline.id).toBe('optimize-media-to-reduce-resource-use')
    expect(guideline.specUrl).toMatch(/^https:\/\//u)
    expect(guideline.description.length).toBeGreaterThan(0)
    expect(guideline.legacyIds).toEqual(expect.arrayContaining(['2.7', '2.11']))
    expect(notices).toEqual([])
    expect(textOf(result)).toContain(guideline.specUrl)
  })

  it('resolves a deprecated numeric ID and says which slug to use', async () => {
    const result = await call('get_guideline', { id: '3.3' })
    const { guideline, notices } = result.structuredContent as Detail

    expect(guideline.id).toBe('minify-and-remove-unused-code')
    expect(notices).toEqual([expect.stringContaining('"3.3" is deprecated')])
    expect(textOf(result)).toContain('> numeric guideline ID "3.3" is deprecated')
  })

  it.each([
    [
      'a numeric ID whose guideline was removed',
      '3.15',
      '"security-headers" (related check, not scored)',
    ],
    ['a related-check ID', 'form-validation', 'is a related check, not a WSG guideline'],
    ['an unknown ID', 'no-such-guideline', 'Use list_guidelines to find its slug'],
  ])('returns an explanatory error for %s', async (_case, id, explanation) => {
    const result = await call('get_guideline', { id })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain(explanation)
  })
})
