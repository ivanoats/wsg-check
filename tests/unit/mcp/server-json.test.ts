// @vitest-environment node
/**
 * Keeps server.json (the MCP Registry listing) consistent with package.json.
 * The registry rejects a publish when the npm package's mcpName differs from
 * server.json's name, and release-please bumps both versions together.
 */

import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')) as Record<
    string,
    unknown
  >

type ServerJson = {
  name: string
  description: string
  version: string
  packages: { identifier: string; version: string; packageArguments: { value: string }[] }[]
}

const pkg = readJson('package.json') as { name: string; version: string; mcpName: string }
const server = readJson('server.json') as ServerJson

describe('server.json', () => {
  it('names the server with package.json mcpName', () => {
    expect(server.name).toBe(pkg.mcpName)
  })

  it('lists this npm package at the package.json version', () => {
    const [npmPackage] = server.packages
    expect(server.version).toBe(pkg.version)
    expect(npmPackage.identifier).toBe(pkg.name)
    expect(npmPackage.version).toBe(pkg.version)
  })

  it('starts the MCP server with --mcp', () => {
    expect(server.packages[0].packageArguments.map((arg) => arg.value)).toEqual(['--mcp'])
  })

  it('keeps the description within the registry limit of 100 characters', () => {
    expect(server.description.length).toBeLessThanOrEqual(100)
  })
})
