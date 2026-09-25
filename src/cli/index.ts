/**
 * CLI Module — Phase 7
 *
 * Entry point for the `wsg-check` command-line tool.
 * Parses arguments with `commander`, runs the WSG check pipeline,
 * writes the formatted report, and exits with an appropriate code.
 *
 * Usage:
 *   wsg-check <url> [options]
 *   wsg-check --help
 *   wsg-check --version
 *
 * Exit codes:
 *   0 — check succeeded and score is at or above `--fail-threshold`
 *   1 — check failed (fetch/parse error) or score is below threshold
 */

import { writeFileSync, readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Command } from 'commander'
import { resolveConfig } from '../config/loader'
import { WSG_SPEC } from '../config/spec/index'
import type { OutputFormat, WSGCategory } from '../config/types'
import { runReport, selectChecks, type SelectionNotice } from '../pipeline/index'
import type { SustainabilityReport } from '../report/types'
import { formatJson, formatMarkdown, formatHtml, formatTerminal } from '../report/formatters/index'

// ─── Package version ──────────────────────────────────────────────────────────

// Resolve package.json relative to this file's location. The compiled output
// is placed at dist/cli/index.js, so ../../package.json always points to the
// project root package.json (two levels up from dist/cli/).
const _pkgPath = join(dirname(fileURLToPath(import.meta.url)), '../../package.json')
const _pkg = JSON.parse(readFileSync(_pkgPath, 'utf8')) as { version: string }

// ─── Types ────────────────────────────────────────────────────────────────────

/** Raw option values parsed by commander. */
interface CliOptions {
  readonly format?: string
  readonly output?: string
  readonly categories?: string
  readonly guidelines?: string
  readonly failThreshold?: string
  readonly verbose?: boolean
  readonly config?: string
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

/**
 * Starts a terminal spinner that writes to stderr.
 * Returns a stop function that clears the spinner line.
 */
const startSpinner = (message: string): (() => void) => {
  if (!process.stderr.isTTY) {
    process.stderr.write(`${message}\n`)
    return () => {
      /* no-op */
    }
  }

  let frame = 0
  const interval = setInterval(() => {
    process.stderr.write(`\r${SPINNER_FRAMES[frame % SPINNER_FRAMES.length]} ${message}`)
    frame++
  }, 80)

  return () => {
    clearInterval(interval)
    process.stderr.write('\r\x1b[K') // erase spinner line
  }
}

// ─── Format helpers ───────────────────────────────────────────────────────────

/**
 * Serialises the report to the requested format string.
 */
const renderReport = (report: SustainabilityReport, format: OutputFormat): string => {
  switch (format) {
    case 'json':
      return formatJson(report)
    case 'markdown':
      return formatMarkdown(report)
    case 'html':
      return formatHtml(report)
    default:
      return formatTerminal(report, { colors: process.stdout.isTTY !== false })
  }
}

// ─── CLI flag builder ─────────────────────────────────────────────────────────

/**
 * Maps raw commander option strings to typed config properties.
 * Extracted to keep `runCheck` below the cognitive-complexity threshold.
 */
const buildCliFlags = (url: string, opts: CliOptions) => ({
  url,
  ...(opts.format ? { format: opts.format as OutputFormat } : {}),
  ...(opts.output ? { outputPath: opts.output } : {}),
  ...(opts.categories
    ? { categories: opts.categories.split(',').map((c) => c.trim() as WSGCategory) }
    : {}),
  ...(opts.guidelines ? { guidelines: opts.guidelines.split(',').map((g) => g.trim()) } : {}),
  ...(opts.failThreshold ? { failThreshold: Number.parseInt(opts.failThreshold, 10) } : {}),
  ...(opts.verbose ? { verbose: true } : {}),
})

// ─── Selection notices ────────────────────────────────────────────────────────

/** Writes selection notices (deprecated IDs, empty categories) to stderr. */
const writeNotices = (notices: ReadonlyArray<SelectionNotice>): void => {
  for (const { level, message } of notices) {
    process.stderr.write(`${level === 'note' ? 'Note' : 'Warning'}: ${message}\n`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Core logic: fetch, run checks, format, write.
 *
 * Returns the intended process exit code:
 *   - `0` on success with score ≥ threshold
 *   - `1` on fetch/parse error or score below threshold
 *
 * Exported for unit testing without spawning a subprocess.
 */
export const runCheck = async (url: string, opts: CliOptions): Promise<number> => {
  // ── Resolve configuration ────────────────────────────────────────────────
  const config = resolveConfig(buildCliFlags(url, opts), opts.config)

  const format: OutputFormat = config.format ?? 'terminal'
  const failThreshold = config.failThreshold ?? 0

  // ── Select check functions ───────────────────────────────────────────────
  const { checks, notices } = selectChecks(
    config.categories ?? ['ux', 'web-dev', 'hosting', 'business'],
    config.guidelines
  )
  writeNotices(notices)

  // ── Run the check pipeline ───────────────────────────────────────────────
  const stopSpinner = startSpinner(`Analysing ${url} …`)
  const result = await runReport(url, { checks, config })
  stopSpinner()

  if (!result.ok) {
    process.stderr.write(`\n✗ Error: ${result.error.message}\n`)
    return 1
  }

  const report = result.value
  const output = renderReport(report, format)

  // ── Write output ─────────────────────────────────────────────────────────
  if (config.outputPath) {
    try {
      writeFileSync(config.outputPath, output, 'utf8')
      process.stderr.write(`Report written to ${config.outputPath}\n`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(`\n✗ Failed to write report to ${config.outputPath}: ${message}\n`)
      return 1
    }
  } else {
    process.stdout.write(`${output}\n`)
  }

  // ── Exit code ────────────────────────────────────────────────────────────
  if (report.overallScore < failThreshold) {
    process.stderr.write(
      `\n✗ Score ${report.overallScore} is below fail-threshold ${failThreshold}\n`
    )
    return 1
  }

  return 0
}

/**
 * Builds and configures the commander `Command` instance.
 * Exported for testing.
 */
export const buildProgram = (): Command => {
  const program = new Command()

  program
    .name('wsg-check')
    .description('Check a website against the W3C Web Sustainability Guidelines')
    .version(`${_pkg.version} (WSG ${WSG_SPEC.release})`)
    .argument('<url>', 'URL of the website to check')
    .option('-f, --format <format>', 'output format: json | markdown | html | terminal', 'terminal')
    .option('-o, --output <path>', 'write report to a file instead of stdout')
    .option(
      '-c, --categories <list>',
      'comma-separated categories to run: ux,web-dev,hosting (business: planned, no checks yet)'
    )
    .option(
      '-g, --guidelines <list>',
      'comma-separated guideline IDs to run (e.g. minify-and-remove-unused-code)'
    )
    .option(
      '--fail-threshold <score>',
      'exit with code 1 if score is below this value (0-100)',
      '0'
    )
    .option('--config <path>', 'path to wsg-check.config.json or .wsgcheckrc.json')
    .option('-v, --verbose', 'enable verbose logging')

  program.action(async (url: string, opts: CliOptions) => {
    const exitCode = await runCheck(url, opts)
    process.exitCode = exitCode
  })

  return program
}

// ─── Entry point ──────────────────────────────────────────────────────────────

/**
 * Returns `true` when `scriptPath` (normally `process.argv[1]`) is the module
 * at `moduleUrl`. Both paths are resolved with `realpathSync`, because npm
 * installs the `wsg-check` bin as a symlink: `argv[1]` is the symlink, while
 * `import.meta.url` is the real file. Returns `false` when there is no script
 * path (e.g. `node --eval`) or either path cannot be resolved.
 *
 * Exported for testing.
 */
export const isEntryPoint = (moduleUrl: string, scriptPath?: string): boolean => {
  if (scriptPath === undefined) return false
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(scriptPath)
  } catch {
    return false
  }
}

// Only run when this file is the direct entry point (not when imported by tests).
if (isEntryPoint(import.meta.url, process.argv[1])) {
  const program = buildProgram()
  try {
    await program.parseAsync(process.argv)
  } catch (err: unknown) {
    process.stderr.write(`Unexpected error: ${err instanceof Error ? err.message : String(err)}\n`)
    process.exitCode = 1
  }
}
