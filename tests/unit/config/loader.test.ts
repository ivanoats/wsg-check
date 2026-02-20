import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadFromEnv, loadFromFile, resolveConfig } from '@/config/loader'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import path from 'path'
import os from 'os'

// ─── loadFromEnv ─────────────────────────────────────────────────────────────

describe('loadFromEnv', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    // Restore original environment
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key]
      }
    }
    Object.assign(process.env, originalEnv)
  })

  it('returns empty object when no WSG_ vars are set', () => {
    // Remove all WSG_ and alias vars
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('WSG_') || key === 'REQUEST_TIMEOUT_MS' || key === 'MAX_CRAWL_DEPTH') {
        delete process.env[key]
      }
    }
    const cfg = loadFromEnv()
    expect(Object.keys(cfg)).toHaveLength(0)
  })

  it('picks up WSG_URL', () => {
    process.env.WSG_URL = 'https://example.com'
    const cfg = loadFromEnv()
    expect(cfg.url).toBe('https://example.com')
  })

  it('parses WSG_CATEGORIES as an array', () => {
    process.env.WSG_CATEGORIES = 'ux,hosting'
    const cfg = loadFromEnv()
    expect(cfg.categories).toEqual(['ux', 'hosting'])
  })

  it('parses WSG_GUIDELINES as an array', () => {
    process.env.WSG_GUIDELINES = '3.1,3.2'
    const cfg = loadFromEnv()
    expect(cfg.guidelines).toEqual(['3.1', '3.2'])
  })

  it('parses WSG_TIMEOUT as a number', () => {
    process.env.WSG_TIMEOUT = '10000'
    const cfg = loadFromEnv()
    expect(cfg.timeout).toBe(10000)
  })

  it('uses REQUEST_TIMEOUT_MS alias when WSG_TIMEOUT is absent', () => {
    delete process.env.WSG_TIMEOUT
    process.env.REQUEST_TIMEOUT_MS = '5000'
    const cfg = loadFromEnv()
    expect(cfg.timeout).toBe(5000)
  })

  it('uses MAX_CRAWL_DEPTH alias when WSG_MAX_DEPTH is absent', () => {
    delete process.env.WSG_MAX_DEPTH
    process.env.MAX_CRAWL_DEPTH = '3'
    const cfg = loadFromEnv()
    expect(cfg.maxDepth).toBe(3)
  })

  it('parses WSG_FOLLOW_REDIRECTS false', () => {
    process.env.WSG_FOLLOW_REDIRECTS = 'false'
    const cfg = loadFromEnv()
    expect(cfg.followRedirects).toBe(false)
  })

  it('treats any non-"false" value for WSG_FOLLOW_REDIRECTS as true', () => {
    process.env.WSG_FOLLOW_REDIRECTS = 'true'
    const cfg = loadFromEnv()
    expect(cfg.followRedirects).toBe(true)
  })

  it('parses WSG_VERBOSE true', () => {
    process.env.WSG_VERBOSE = 'true'
    const cfg = loadFromEnv()
    expect(cfg.verbose).toBe(true)
  })

  it('parses WSG_FAIL_THRESHOLD as a number', () => {
    process.env.WSG_FAIL_THRESHOLD = '75'
    const cfg = loadFromEnv()
    expect(cfg.failThreshold).toBe(75)
  })
})

// ─── loadFromFile ─────────────────────────────────────────────────────────────

describe('loadFromFile', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `wsg-test-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns empty object when no config file exists', () => {
    const cfg = loadFromFile(tmpDir)
    expect(cfg).toEqual({})
  })

  it('loads wsg-check.config.json', () => {
    const filePath = path.join(tmpDir, 'wsg-check.config.json')
    writeFileSync(filePath, JSON.stringify({ url: 'https://test.com', timeout: 5000 }))
    const cfg = loadFromFile(tmpDir)
    expect(cfg.url).toBe('https://test.com')
    expect(cfg.timeout).toBe(5000)
  })

  it('loads .wsgcheckrc.json as fallback', () => {
    const filePath = path.join(tmpDir, '.wsgcheckrc.json')
    writeFileSync(filePath, JSON.stringify({ verbose: true }))
    const cfg = loadFromFile(tmpDir)
    expect(cfg.verbose).toBe(true)
  })

  it('prefers wsg-check.config.json over .wsgcheckrc.json', () => {
    writeFileSync(path.join(tmpDir, 'wsg-check.config.json'), JSON.stringify({ timeout: 1000 }))
    writeFileSync(path.join(tmpDir, '.wsgcheckrc.json'), JSON.stringify({ timeout: 2000 }))
    const cfg = loadFromFile(tmpDir)
    expect(cfg.timeout).toBe(1000)
  })
})

// ─── resolveConfig ────────────────────────────────────────────────────────────

describe('resolveConfig', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `wsg-resolve-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
    // Remove any WSG_ env vars that could bleed in
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('WSG_') || key === 'REQUEST_TIMEOUT_MS' || key === 'MAX_CRAWL_DEPTH') {
        delete process.env[key]
      }
    }
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('uses defaults when no overrides are provided', () => {
    const cfg = resolveConfig({}, tmpDir)
    expect(cfg.format).toBe('terminal')
    expect(cfg.maxDepth).toBe(1)
    expect(cfg.followRedirects).toBe(true)
  })

  it('config file overrides defaults', () => {
    writeFileSync(
      path.join(tmpDir, 'wsg-check.config.json'),
      JSON.stringify({ format: 'json', timeout: 5000 })
    )
    const cfg = resolveConfig({}, tmpDir)
    expect(cfg.format).toBe('json')
    expect(cfg.timeout).toBe(5000)
  })

  it('CLI flags take highest precedence', () => {
    writeFileSync(path.join(tmpDir, 'wsg-check.config.json'), JSON.stringify({ format: 'json' }))
    process.env.WSG_FORMAT = 'html'
    const cfg = resolveConfig({ format: 'markdown' }, tmpDir)
    expect(cfg.format).toBe('markdown')
    delete process.env.WSG_FORMAT
  })

  it('env vars override config file but not CLI flags', () => {
    writeFileSync(path.join(tmpDir, 'wsg-check.config.json'), JSON.stringify({ timeout: 1000 }))
    process.env.WSG_TIMEOUT = '2000'
    const cfg = resolveConfig({}, tmpDir)
    expect(cfg.timeout).toBe(2000)
    delete process.env.WSG_TIMEOUT
  })
})
