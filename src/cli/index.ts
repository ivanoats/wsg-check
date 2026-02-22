#!/usr/bin/env node
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

import { writeFileSync, readFileSync } from 'fs'
import { pathToFileURL, fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Command } from 'commander'
import { resolveConfig } from '../config/loader.js'
import type { OutputFormat, WSGCategory } from '../config/types.js'
import { WsgChecker } from '../core/index.js'
import type { CheckFnWithId } from '../core/types.js'
import {
  performanceChecks,
  semanticChecks,
  sustainabilityChecks,
  securityChecks,
  uxDesignChecks,
  hostingChecks,
} from '../checks/index.js'
import { fromRunResult } from '../report/types.js'
import {
  formatJson,
  formatMarkdown,
  formatHtml,
  formatTerminal,
} from '../report/formatters/index.js'

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
const renderReport = (report: ReturnType<typeof fromRunResult>, format: OutputFormat): string => {
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
  ...(opts.failThreshold ? { failThreshold: parseInt(opts.failThreshold, 10) } : {}),
  ...(opts.verbose ? { verbose: true } : {}),
})

// ─── Check selector ───────────────────────────────────────────────────────────

/**
 * Selects and optionally filters check functions from the available check
 * arrays based on category selection and requested guideline IDs.
 * Extracted to keep `runCheck` below the cognitive-complexity threshold.
 */
const selectChecks = (
  categories: ReadonlySet<WSGCategory>,
  guidelines: readonly string[]
): ReadonlyArray<CheckFnWithId> => {
  if (categories.has('business')) {
    process.stderr.write(
      'Note: the "business" category has no automated checks in the current version.\n'
    )
  }

  const categoryChecks: ReadonlyArray<CheckFnWithId> = [
    ...(categories.has('web-dev')
      ? [...performanceChecks, ...semanticChecks, ...sustainabilityChecks, ...securityChecks]
      : []),
    ...(categories.has('ux') ? [...uxDesignChecks] : []),
    ...(categories.has('hosting') ? [...hostingChecks] : []),
  ]

  return guidelines.length > 0
    ? categoryChecks.filter((c) => guidelines.includes(c.guidelineId))
    : categoryChecks
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Builds and configures the commander `Command` instance.
 * Exported for testing.
 */
export const buildProgram = (): Command => {
  const program = new Command()

  program
    .name('wsg-check')
    .description('Check a website against the W3C Web Sustainability Guidelines')
    .version(_pkg.version)
    .argument('<url>', 'URL of the website to check')
    .option('-f, --format <format>', 'output format: json | markdown | html | terminal', 'terminal')
    .option('-o, --output <path>', 'write report to a file instead of stdout')
    .option(
      '-c, --categories <list>',
      'comma-separated categories to run: ux,web-dev,hosting (business: planned, no checks yet)'
    )
    .option('-g, --guidelines <list>', 'comma-separated guideline IDs to run (e.g. 3.1,3.2)')
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

  const format: OutputFormat = (config.format ?? 'terminal') as OutputFormat
  const failThreshold = config.failThreshold ?? 0

  // ── Select check functions ───────────────────────────────────────────────
  const selectedCategories = new Set(config.categories ?? ['ux', 'web-dev', 'hosting', 'business'])
  const allChecks = selectChecks(selectedCategories, config.guidelines)

  // ── Run the check pipeline ───────────────────────────────────────────────
  const stopSpinner = startSpinner(`Analysing ${url} …`)

  const checker = new WsgChecker(config, allChecks)
  const result = await checker.check(url)

  stopSpinner()

  if (!result.ok) {
    process.stderr.write(`\n✗ Error: ${result.error.message}\n`)
    return 1
  }

  const runResult = result.value

  // ── Build and format the report ──────────────────────────────────────────
  // `RunResult` is the output of `WsgChecker.check()` and does not expose the
  // raw `PageData` (which holds detailed page-weight metrics). Those metrics
  // are unavailable at this point, so we pass 0. They are populated when
  // `fromRunResult` is called from layers that have direct access to `PageData`
  // (e.g. the API or frontend).
  const report = fromRunResult(runResult, 0, 0, 0)
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
    process.stdout.write(output + '\n')
  }

  // ── Exit code ────────────────────────────────────────────────────────────
  if (runResult.overallScore < failThreshold) {
    process.stderr.write(
      `\n✗ Score ${runResult.overallScore} is below fail-threshold ${failThreshold}\n`
    )
    return 1
  }

  return 0
}

// ─── Entry point ──────────────────────────────────────────────────────────────

// Only run when this file is the direct entry point (not when imported by tests).
// In Node.js ESM we compare import.meta.url to the resolved argv[1] path.
const _isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href

if (_isMain) {
  const program = buildProgram()
  program.parseAsync(process.argv).catch((err: unknown) => {
    process.stderr.write(`Unexpected error: ${err instanceof Error ? err.message : String(err)}\n`)
    process.exit(1)
  })
}
