/**
 * Smoke test for the wsg-check-mcp binary over real stdio.
 *
 * Usage: node tests/smoke/mcp-stdio.mjs
 *
 * Tests the copy of @sustainablewebsites/wsg-check installed where it runs
 * (the CI job runs it from a directory where the packed tarball is
 * installed), or this repository's dist/ build when no installed copy is
 * found. It runs the server with the current Node binary, sends initialize,
 * notifications/initialized and tools/list, then checks that check_url is
 * listed and that every stdout line is a JSON-RPC message (anything else
 * would corrupt the protocol for real clients). Exits non-zero on failure.
 */

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const TIMEOUT_MS = 15_000

/** The installed package's server if one is found from here, else this repo's build. */
const findServer = () => {
  try {
    const require = createRequire(join(process.cwd(), 'noop.js'))
    const packageJson = require.resolve('@sustainablewebsites/wsg-check/package.json')
    return join(dirname(packageJson), 'dist', 'mcp', 'index.js')
  } catch {
    return fileURLToPath(new URL('../../dist/mcp/index.js', import.meta.url))
  }
}

const runSmokeTest = (serverPath) =>
  new Promise((resolvePromise, rejectPromise) => {
    console.log(`server: ${serverPath}`)
    const child = spawn(process.execPath, [serverPath], {
      stdio: ['pipe', 'pipe', 'inherit'],
    })
    const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`)
    const finish = (error) => {
      clearTimeout(timer)
      child.removeAllListeners('exit')
      child.kill()
      if (error) rejectPromise(error)
      else resolvePromise()
    }
    const timer = setTimeout(
      () => finish(new Error(`no tools/list response within ${TIMEOUT_MS} ms`)),
      TIMEOUT_MS
    )

    const parse = (line) => {
      try {
        return JSON.parse(line)
      } catch {
        return undefined
      }
    }

    createInterface({ input: child.stdout }).on('line', (line) => {
      const message = parse(line)
      if (message?.jsonrpc !== '2.0') {
        finish(new Error(`non-JSON-RPC output on stdout: ${line.slice(0, 200)}`))
        return
      }
      if (message.id === 1) {
        if (message.error) {
          finish(new Error(`initialize failed: ${JSON.stringify(message.error)}`))
          return
        }
        const { name, version } = message.result.serverInfo
        console.log(`initialize: ${name} ${version}`)
        send({ jsonrpc: '2.0', method: 'notifications/initialized' })
        send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
      } else if (message.id === 2) {
        const names = (message.result?.tools ?? []).map((tool) => tool.name)
        console.log(`tools/list: ${names.join(', ')}`)
        finish(names.includes('check_url') ? undefined : new Error('check_url is not listed'))
      }
    })

    child.on('exit', (code) => finish(new Error(`server exited early with code ${code}`)))

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
  })

runSmokeTest(findServer()).then(
  () => console.log('MCP smoke test passed'),
  (error) => {
    console.error(`MCP smoke test failed: ${error.message}`)
    process.exitCode = 1
  }
)
