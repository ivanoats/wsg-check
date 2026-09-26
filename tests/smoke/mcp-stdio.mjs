#!/usr/bin/env node
/* global process, console, setTimeout, clearTimeout */
/**
 * Smoke test for the wsg-check-mcp binary over real stdio.
 *
 * Usage: node tests/smoke/mcp-stdio.mjs <command> [args...]
 *   e.g. node tests/smoke/mcp-stdio.mjs node dist/mcp/index.js
 *
 * Sends initialize, notifications/initialized and tools/list, then checks
 * that check_url is listed and that every stdout line is a JSON-RPC message
 * (anything else would corrupt the protocol for real clients).
 */

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'

const [command, ...args] = process.argv.slice(2)
if (!command) {
  console.error('usage: mcp-stdio.mjs <command> [args...]')
  process.exit(2)
}

const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'inherit'] })
const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`)
const fail = (reason) => {
  console.error(`MCP smoke test failed: ${reason}`)
  child.kill()
  process.exit(1)
}

const timer = setTimeout(() => fail('no tools/list response within 15 s'), 15_000)

createInterface({ input: child.stdout }).on('line', (line) => {
  let message
  try {
    message = JSON.parse(line)
  } catch {
    fail(`non-JSON output on stdout: ${line.slice(0, 200)}`)
  }
  if (message.jsonrpc !== '2.0') fail(`not a JSON-RPC message: ${line.slice(0, 200)}`)

  if (message.id === 1) {
    if (message.error) fail(`initialize failed: ${JSON.stringify(message.error)}`)
    console.log(
      `initialize: ${message.result.serverInfo.name} ${message.result.serverInfo.version}`
    )
    send({ jsonrpc: '2.0', method: 'notifications/initialized' })
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
  } else if (message.id === 2) {
    const names = (message.result?.tools ?? []).map((tool) => tool.name)
    console.log(`tools/list: ${names.join(', ')}`)
    if (!names.includes('check_url')) fail('check_url is not listed')
    clearTimeout(timer)
    child.stdin.end()
    child.kill()
    console.log('MCP smoke test passed')
    process.exit(0)
  }
})

child.on('exit', (code) => fail(`server exited early with code ${code}`))

send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'wsg-check-smoke', version: '1.0.0' },
  },
})
