/**
 * The `list_guidelines` and `get_guideline` MCP tools: read-only lookups in
 * the guidelines registry for the targeted WSG release. No network access.
 */

import { z } from 'zod'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { loadGuidelines, findGuidelineById } from '../api/guidelines'
import { LEGACY_GUIDELINE_IDS } from '../config/guidelines-registry'
import type { GuidelineEntry } from '../config/types'
import { ALL_CHECKS, selectChecks } from '../pipeline/index'

const CATEGORIES = ['ux', 'web-dev', 'hosting', 'business'] as const
const TESTABILITY = ['automated', 'semi-automated', 'manual-only'] as const

// ─── Schemas ──────────────────────────────────────────────────────────────────

const specSchema = z.object({
  release: z.string().describe('The WSG release, e.g. "July-2026"'),
  url: z.string(),
})

const guidelineSummarySchema = z.object({
  id: z.string().describe('Stable slug; pass it to get_guideline or check_url'),
  number: z.string().describe('Position in this release, for display only'),
  title: z.string(),
  section: z.string(),
  category: z.enum(CATEGORIES),
  testability: z.enum(TESTABILITY),
  automatedChecks: z.number().describe('How many check_url checks implement this guideline'),
})

export const listGuidelinesInputSchema = {
  category: z.enum(CATEGORIES).optional().describe('Only guidelines in this category'),
  testability: z
    .enum(TESTABILITY)
    .optional()
    .describe('Only guidelines that can be tested this way'),
  query: z
    .string()
    .min(1)
    .optional()
    .describe('Case-insensitive text to find in the title or slug, e.g. "image"'),
}

export const listGuidelinesOutputSchema = {
  spec: specSchema,
  count: z.number(),
  guidelines: z.array(guidelineSummarySchema),
}

export const getGuidelineInputSchema = {
  id: z
    .string()
    .min(1)
    .describe('A guideline slug such as "minify-and-remove-unused-code", or a legacy number'),
}

export const getGuidelineOutputSchema = {
  spec: specSchema,
  guideline: guidelineSummarySchema.extend({
    description: z.string(),
    specUrl: z.string().describe('The guideline in the W3C specification'),
    legacyIds: z
      .array(z.string())
      .describe('Deprecated numeric IDs that resolve to this guideline'),
  }),
  notices: z.array(z.string()).describe('Notes about the request, e.g. a deprecated ID'),
}

export type ListGuidelinesInput = {
  category?: (typeof CATEGORIES)[number]
  testability?: (typeof TESTABILITY)[number]
  query?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const automatedCheckCount = (slug: string): number =>
  ALL_CHECKS.filter((check) => check.guidelineSlug === slug).length

const summarize = (guideline: GuidelineEntry): z.infer<typeof guidelineSummarySchema> => ({
  id: guideline.id,
  number: guideline.number,
  title: guideline.title,
  section: guideline.section,
  category: guideline.category,
  testability: guideline.testability,
  automatedChecks: automatedCheckCount(guideline.id),
})

const RELATED_CHECK_IDS: ReadonlySet<string> = new Set(
  ALL_CHECKS.flatMap((check) => (check.relatedId === null ? [] : [check.relatedId]))
)

const errorResult = (text: string): CallToolResult => ({
  isError: true,
  content: [{ type: 'text', text }],
})

// ─── Handlers ─────────────────────────────────────────────────────────────────

/** Runs `list_guidelines`. */
export const handleListGuidelines = (input: ListGuidelinesInput): CallToolResult => {
  const { spec, guidelines } = loadGuidelines()
  const query = input.query?.toLowerCase()
  const matches = guidelines
    .filter((g) => input.category === undefined || g.category === input.category)
    .filter((g) => input.testability === undefined || g.testability === input.testability)
    .filter(
      (g) => query === undefined || g.title.toLowerCase().includes(query) || g.id.includes(query)
    )
    .map(summarize)

  const lines = matches.map(
    (g) =>
      `- ${g.number} ${g.title} (\`${g.id}\`; ${g.category}, ${g.testability}, ` +
      `${g.automatedChecks} automated check${g.automatedChecks === 1 ? '' : 's'})`
  )
  return {
    structuredContent: {
      spec: { release: spec.release, url: spec.url },
      count: matches.length,
      guidelines: matches,
    },
    content: [
      {
        type: 'text',
        text: [
          `# WSG ${spec.release} guidelines (${matches.length})`,
          '',
          ...(lines.length === 0 ? ['No guidelines match.'] : lines),
        ].join('\n'),
      },
    ],
  }
}

/** Runs `get_guideline`. Unknown IDs are returned as `isError` results. */
export const handleGetGuideline = ({ id }: { id: string }): CallToolResult => {
  const { spec, guideline } = findGuidelineById(id)
  if (guideline === undefined) {
    if (RELATED_CHECK_IDS.has(id)) {
      return errorResult(
        `"${id}" is a related check, not a WSG guideline: check_url reports it but does not ` +
          "score it. Pass it to check_url's guidelines to run it on its own."
      )
    }
    const [notice] = selectChecks(undefined, [id]).notices
    return errorResult(
      notice === undefined
        ? `No guideline "${id}" in WSG ${spec.release}. Use list_guidelines to find its slug.`
        : `No guideline "${id}" in WSG ${spec.release}: ${notice.message}`
    )
  }

  const notices = id === guideline.id ? [] : selectChecks(undefined, [id]).notices
  const legacyIds = [...LEGACY_GUIDELINE_IDS]
    .filter(([, slug]) => slug === guideline.id)
    .map(([legacyId]) => legacyId)
  const summary = summarize(guideline)
  return {
    structuredContent: {
      spec: { release: spec.release, url: spec.url },
      guideline: {
        ...summary,
        description: guideline.description,
        specUrl: guideline.specUrl,
        legacyIds,
      },
      notices: notices.map((notice) => notice.message),
    },
    content: [
      {
        type: 'text',
        text: [
          `# ${guideline.number} ${guideline.title}`,
          '',
          `\`${guideline.id}\` · ${guideline.section} · ${guideline.category} · ` +
            `${guideline.testability} · ${summary.automatedChecks} automated check` +
            `${summary.automatedChecks === 1 ? '' : 's'} in check_url`,
          ...notices.map((notice) => `> ${notice.message}`),
          '',
          guideline.description,
          '',
          guideline.specUrl,
        ].join('\n'),
      },
    ],
  }
}
