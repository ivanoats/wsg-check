/**
 * The `check_url` MCP tool: schemas, the compact summary projection, and the
 * handler that runs the shared pipeline.
 */

import { z } from 'zod'
import type { CallToolResult, ServerNotification } from '@modelcontextprotocol/sdk/types.js'
import type { CheckStage } from '../core/index'
import { runReport, selectChecks } from '../pipeline/index'
import { formatMarkdown } from '../report/formatters/index'
import type { SustainabilityReport } from '../report/types'
import type { HostPolicy } from '../utils/host-policy'

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const DEFAULT_TIMEOUT_MS = 60_000

export const checkUrlInputSchema = {
  url: z
    .url({ protocol: /^https?$/u })
    .describe('The page to check, e.g. https://example.com or http://localhost:3000'),
  categories: z
    .array(z.enum(['ux', 'web-dev', 'hosting']))
    .min(1)
    .optional()
    .describe('WSG categories to run. Defaults to all three.'),
  guidelines: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe(
      'Narrow the run to these guideline slugs (e.g. "minify-and-remove-unused-code") or related-check IDs.'
    ),
  detail: z
    .enum(['summary', 'full'])
    .optional()
    .describe(
      '"summary" (default) returns the score and the failed or warned checks. "full" also returns the complete report, which is much longer.'
    ),
  timeoutMs: z
    .number()
    .int()
    .min(1_000)
    .max(300_000)
    .optional()
    .describe(`Give up after this many milliseconds. Defaults to ${DEFAULT_TIMEOUT_MS}.`),
}

const issueSchema = z.object({
  guidelineId: z.string(),
  guidelineNumber: z.string().optional(),
  guidelineName: z.string(),
  related: z.boolean().describe('true for related checks, which are reported but not scored'),
  status: z.enum(['fail', 'warn']),
  impact: z.enum(['high', 'medium', 'low']),
  message: z.string(),
  recommendation: z.string().optional(),
})

const summarySchema = z.object({
  url: z.string().describe('The URL that was requested'),
  finalUrl: z.string().describe('The URL actually fetched, after redirects'),
  specVersion: z.string().describe('The WSG release the checks were scored against'),
  overallScore: z.number(),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  categories: z.array(z.object({ category: z.string(), score: z.number() })),
  counts: z.object({
    totalChecks: z.number(),
    passed: z.number(),
    failed: z.number(),
    warnings: z.number(),
    notApplicable: z.number(),
    relatedChecks: z.number(),
  }),
  issues: z
    .array(issueSchema)
    .describe('Failed and warned checks: WSG checks first, then by impact, failures first'),
  carbon: z
    .object({
      co2GramsPerPageView: z.number().optional(),
      model: z.string().optional(),
      greenHosted: z.boolean().optional(),
    })
    .describe('Estimated from the HTML size only; absent fields were not measured'),
  notices: z.array(z.string()).describe('Notes about the request, e.g. deprecated guideline IDs'),
})

export const checkUrlOutputSchema = {
  detail: z.enum(['summary', 'full']),
  summary: summarySchema,
  report: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('The complete report; present only when detail is "full"'),
}

export type CheckUrlInput = {
  url: string
  categories?: Array<'ux' | 'web-dev' | 'hosting'>
  guidelines?: string[]
  detail?: 'summary' | 'full'
  timeoutMs?: number
}

type Summary = z.infer<typeof summarySchema>
type Issue = z.infer<typeof issueSchema>

// ─── Summary projection ───────────────────────────────────────────────────────

const IMPACT_RANK: Record<Issue['impact'], number> = { high: 0, medium: 1, low: 2 }

const STATUS_RANK: Record<Issue['status'], number> = { fail: 0, warn: 1 }

const compareIssues = (a: Issue, b: Issue): number =>
  Number(a.related) - Number(b.related) ||
  IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact] ||
  STATUS_RANK[a.status] - STATUS_RANK[b.status]

/** Projects a full report onto the compact summary returned by default. */
export const summarizeReport = (
  report: SustainabilityReport,
  notices: ReadonlyArray<string>
): Summary => ({
  url: report.url,
  finalUrl: report.metadata.finalUrl ?? report.url,
  specVersion: report.specVersion,
  overallScore: report.overallScore,
  grade: report.grade,
  categories: report.categories.map(({ category, score }) => ({ category, score })),
  counts: {
    totalChecks: report.summary.totalChecks,
    passed: report.summary.passed,
    failed: report.summary.failed,
    warnings: report.summary.warnings,
    notApplicable: report.summary.notApplicable,
    relatedChecks: report.summary.relatedChecks,
  },
  issues: report.checks
    .filter((check) => check.status === 'fail' || check.status === 'warn')
    .map((check) => ({
      guidelineId: check.guidelineId,
      ...(check.guidelineNumber === undefined ? {} : { guidelineNumber: check.guidelineNumber }),
      guidelineName: check.guidelineName,
      related: check.related === true,
      status: check.status as Issue['status'],
      impact: check.impact,
      message: check.message,
      ...(check.recommendation === undefined ? {} : { recommendation: check.recommendation }),
    }))
    .sort(compareIssues),
  carbon: {
    ...(report.metadata.co2PerPageView === undefined
      ? {}
      : { co2GramsPerPageView: report.metadata.co2PerPageView }),
    ...(report.metadata.co2Model === undefined ? {} : { model: report.metadata.co2Model }),
    ...(report.metadata.isGreenHosted === undefined
      ? {}
      : { greenHosted: report.metadata.isGreenHosted }),
  },
  notices: [...notices],
})

const issueLabel = (issue: Issue): string => {
  if (issue.guidelineNumber) return `${issue.guidelineNumber} ${issue.guidelineName}`
  return issue.related ? `${issue.guidelineName} (related, not scored)` : issue.guidelineName
}

const issueLine = (issue: Issue): string => {
  const label = issueLabel(issue)
  const fix = issue.recommendation ? ` Fix: ${issue.recommendation}` : ''
  return `- **${issue.status.toUpperCase()}** (${issue.impact}) ${label}: ${issue.message}${fix}`
}

const carbonLines = (carbon: Summary['carbon']): string[] =>
  carbon.co2GramsPerPageView === undefined
    ? []
    : [
        '',
        `Estimated ${carbon.co2GramsPerPageView} g CO₂ per page view (${carbon.model ?? 'unknown model'}); ` +
          `green hosting: ${carbon.greenHosted ? 'yes' : 'no'}.`,
      ]

/** Renders the summary as Markdown for clients that ignore structured output. */
export const summaryToMarkdown = (summary: Summary): string =>
  [
    `# WSG check: ${summary.finalUrl}`,
    '',
    `Score **${summary.overallScore}/100** (grade ${summary.grade}) against WSG ${summary.specVersion}. ` +
      `${summary.counts.passed} passed, ${summary.counts.failed} failed, ${summary.counts.warnings} warnings.`,
    ...(summary.finalUrl === summary.url ? [] : ['', `Requested ${summary.url}, redirected.`]),
    ...(summary.notices.length === 0 ? [] : ['', ...summary.notices.map((n) => `> ${n}`)]),
    '',
    `## Issues (${summary.issues.length})`,
    ...(summary.issues.length === 0 ? ['None.'] : summary.issues.map(issueLine)),
    ...carbonLines(summary.carbon),
  ].join('\n')

// ─── Handler ──────────────────────────────────────────────────────────────────

const STAGES: ReadonlyArray<CheckStage> = ['fetching', 'checking', 'scoring']
const STAGE_MESSAGES: Record<CheckStage, string> = {
  fetching: 'Fetching the page',
  checking: 'Running checks',
  scoring: 'Scoring',
}

/** The request context the handler uses (a subset of the SDK's `RequestHandlerExtra`). */
export interface CheckUrlContext {
  readonly signal: AbortSignal
  readonly _meta?: { progressToken?: string | number }
  readonly sendNotification: (notification: ServerNotification) => Promise<void>
}

export interface CheckUrlOptions {
  readonly hostPolicy: HostPolicy
  /** Aborts running checks when the server shuts down. */
  readonly shutdownSignal?: AbortSignal
}

const errorResult = (text: string): CallToolResult => ({
  isError: true,
  content: [{ type: 'text', text }],
})

/** Adds the server flag to use when the host policy refused a URL. */
const explainFetchError = (message: string): string => {
  if (message.includes('loopback addresses are not allowed')) {
    return `${message}\nThis server was started with --no-local, so local URLs are blocked. Remove that flag from the MCP server configuration to allow them.`
  }
  if (message.includes('private network addresses are not allowed')) {
    return `${message}\nPrivate network addresses are blocked by default. Add --allow-private-network to the MCP server configuration to allow them.`
  }
  return message
}

const progressReporter = (context: CheckUrlContext) => {
  const token = context._meta?.progressToken
  if (token === undefined) return undefined
  return (stage: CheckStage): void => {
    context
      .sendNotification({
        method: 'notifications/progress',
        params: {
          progressToken: token,
          progress: STAGES.indexOf(stage) + 1,
          total: STAGES.length,
          message: STAGE_MESSAGES[stage],
        },
      })
      .catch(() => undefined)
  }
}

/** Runs `check_url`. Failures are returned as `isError` results, never thrown. */
export const handleCheckUrl = async (
  input: CheckUrlInput,
  context: CheckUrlContext,
  options: CheckUrlOptions
): Promise<CallToolResult> => {
  const { checks, notices } = selectChecks(input.categories, input.guidelines)
  if (checks.length === 0) {
    return errorResult(
      'No checks match those categories and guidelines. Use guideline slugs such as "minify-and-remove-unused-code".'
    )
  }

  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timeout = AbortSignal.timeout(timeoutMs)
  const onProgress = progressReporter(context)
  const result = await runReport(input.url, {
    checks,
    config: {
      hostPolicy: options.hostPolicy,
      timeout: timeoutMs,
      signal: AbortSignal.any([
        context.signal,
        timeout,
        ...(options.shutdownSignal ? [options.shutdownSignal] : []),
      ]),
      ...(onProgress ? { onProgress } : {}),
    },
  })

  if (!result.ok) {
    if (context.signal.aborted) return errorResult('The check was cancelled.')
    if (timeout.aborted) {
      return errorResult(`The check timed out after ${timeoutMs} ms. Try a larger timeoutMs.`)
    }
    return errorResult(explainFetchError(result.error.message))
  }

  const report = result.value
  const detail = input.detail ?? 'summary'
  const summary = summarizeReport(
    report,
    notices.map((notice) => notice.message)
  )
  return {
    structuredContent: {
      detail,
      summary,
      ...(detail === 'full' ? { report: structuredClone(report) } : {}),
    },
    content: [
      {
        type: 'text',
        text: detail === 'full' ? formatMarkdown(report) : summaryToMarkdown(summary),
      },
    ],
  }
}
