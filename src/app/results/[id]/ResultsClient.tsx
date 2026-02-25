'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Progress } from '@ark-ui/react'
import { styled } from 'styled-system/jsx'
import { cx, css } from 'styled-system/css'
import { button, card, avatar, progress, code } from 'styled-system/recipes'
import type { SustainabilityReport, Recommendation, ReportSummary } from '@/report/types'
import type { CategoryScore } from '@/core/types'
import type { CheckResponseBody } from '@/api/types'
import { CheckResultsSection } from '@/app/components/CheckResultsSection'
import { SectionHeading } from '@/app/components/SectionHeading'

const RESULT_STORAGE_PREFIX = 'wsg-check:result:'
const RESULT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const parseResultId = (value: string): string | null => {
  const trimmed = value.trim()
  return RESULT_ID_PATTERN.test(trimmed) ? trimmed : null
}

/** Read a cached check result from sessionStorage, or null if unavailable. */
const readCachedResult = (id: string): SustainabilityReport | null => {
  try {
    const raw = sessionStorage.getItem(`${RESULT_STORAGE_PREFIX}${id}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CheckResponseBody
    return parsed.report ?? null
  } catch {
    return null
  }
}

/** Fetch the report from the API using a relative URL (browser handles routing). */
const fetchReportFromApi = async (id: string): Promise<SustainabilityReport | null> => {
  try {
    const res = await fetch(`/api/check/${encodeURIComponent(id)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const body = (await res.json()) as CheckResponseBody
    return body.report ?? null
  } catch {
    return null
  }
}

// ─── Style constants ──────────────────────────────────────────────────────────

/*
 * Per-grade badge colours — literal css() calls ensure Panda generates the
 * utility classes at build time. Dynamic prop values and CSS variables are
 * unreliable (Panda's extractor skips them; vars may not be defined).
 */
const gradeCircleBgClass: Readonly<Record<string, string>> = {
  A: css({ bg: 'green.9' }), // green.9 in Park UI preset ✓
  B: css({ bg: '[#0055b3]' }), // blue.9 token absent → arbitrary hex (≈7.1:1)
  C: css({ bg: 'amber.9' }), // amber.9 in Panda preset ✓
  D: css({ bg: '[#ad4800]' }), // orange.9 token absent → arbitrary hex (≈5.7:1)
  F: css({ bg: '[#c7272d]' }), // darker red than Panda's red.9 (≈5.6:1)
}

const gradeCircleFgClass: Readonly<Record<string, string>> = {
  A: css({ color: 'white' }),
  B: css({ color: 'white' }),
  C: css({ color: 'amber.12' }),
  D: css({ color: 'white' }),
  F: css({ color: 'white' }),
}

const cardStyles = card()
const avatarStyles = avatar({ size: '2xl' })
const progressStyles = progress()

const impactColors: Readonly<Record<string, { bg: string }>> = {
  high: { bg: 'red.9' },
  medium: { bg: 'amber.9' },
  low: { bg: 'gray.7' },
}

const impactDot = (impact: string): string => impactColors[impact]?.bg ?? 'gray.7'

/** Static config for the summary count grid — counts are bound at render time. */
const SUMMARY_CONFIG: ReadonlyArray<{
  readonly label: string
  readonly key: keyof ReportSummary
  readonly colorToken: string
}> = [
  { label: 'Passed', key: 'passed', colorToken: 'green.9' },
  { label: 'Failed', key: 'failed', colorToken: 'red.9' },
  { label: 'Warnings', key: 'warnings', colorToken: 'amber.10' },
  { label: 'N/A', key: 'notApplicable', colorToken: 'gray.7' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Single summary count cell — extracted to limit inline array in JSX. */
const SummaryCountCard = ({
  label,
  count,
  colorToken,
}: {
  readonly label: string
  readonly count: number
  readonly colorToken: string
}) => (
  <styled.div
    role="listitem"
    p="3"
    borderWidth="1px"
    borderColor="border.default"
    borderRadius="md"
    bg="bg.subtle"
    textAlign="center"
  >
    <styled.p fontWeight="bold" fontSize="xl" color={colorToken}>
      {count}
    </styled.p>
    <styled.p fontSize="xs" color="fg.muted">
      {label}
    </styled.p>
  </styled.div>
)

/** Report header with grade badge and score. */
const ReportHeader = ({
  grade,
  score,
  url,
}: {
  readonly grade: string
  readonly score: number
  readonly url: string
}) => (
  <styled.div display="flex" gap="4" alignItems="center" mb="6">
    <span
      className={cx(
        avatarStyles.root,
        css({ flexShrink: '0' }),
        gradeCircleBgClass[grade] ?? css({ bg: 'gray.7' })
      )}
      aria-label={`Grade ${grade}`}
    >
      <span
        className={cx(
          avatarStyles.fallback,
          css({ fontSize: '2xl', fontWeight: 'bold' }),
          gradeCircleFgClass[grade] ?? css({ color: 'white' })
        )}
      >
        {grade}
      </span>
    </span>
    <styled.div>
      <styled.h1
        id="results-heading"
        fontSize={{ base: 'xl', md: '2xl' }}
        fontWeight="bold"
        color="fg.default"
        mb="1"
      >
        Score: {score}/100
      </styled.h1>
      <styled.p fontSize="sm" color="fg.muted" style={{ wordBreak: 'break-all' }}>
        {url}
      </styled.p>
    </styled.div>
  </styled.div>
)

/** Summary counts grid. */
const SummarySection = ({ summary }: { readonly summary: ReportSummary }) => (
  <styled.div
    display="grid"
    gridTemplateColumns="repeat(4, 1fr)"
    gap="3"
    mb="6"
    role="list"
    aria-label="Check summary"
  >
    {SUMMARY_CONFIG.map(({ label, key, colorToken }) => (
      <SummaryCountCard key={label} label={label} count={summary[key]} colorToken={colorToken} />
    ))}
  </styled.div>
)

/** Determine bar color based on category score. */
const getScoreBarColor = (score: number): string => {
  if (score >= 75) return 'green.9'
  if (score >= 50) return 'amber.9'
  return 'red.9'
}

/** Single category score row — extracted to limit JSX nesting depth. */
const CategoryScoreBar = ({ cat }: { readonly cat: CategoryScore }) => {
  const barColor = getScoreBarColor(cat.score)
  return (
    <styled.div className={cardStyles.root}>
      <styled.div display="flex" justifyContent="space-between" alignItems="center" mb="1">
        <styled.span fontSize="sm" fontWeight="medium" color="fg.default">
          {cat.category.toUpperCase()}
        </styled.span>
        <styled.span fontSize="sm" fontWeight="bold" color="fg.default">
          {cat.score}/100
        </styled.span>
      </styled.div>
      <Progress.Root
        className={progressStyles.root}
        value={cat.score}
        min={0}
        max={100}
        aria-label={`${cat.category} score: ${cat.score} out of 100`}
      >
        <Progress.Track className={cx(progressStyles.track, css({ h: '2', borderRadius: 'full' }))}>
          <Progress.Range
            className={cx(progressStyles.range, css({ bg: barColor, borderRadius: 'full' }))}
          />
        </Progress.Track>
      </Progress.Root>
    </styled.div>
  )
}

/** Category breakdown section. */
const CategoryScoresSection = ({
  categories,
}: {
  readonly categories: ReadonlyArray<CategoryScore>
}) => {
  if (categories.length === 0) return null
  return (
    <styled.section aria-labelledby="categories-heading" mb="6">
      <SectionHeading id="categories-heading">Category Scores</SectionHeading>
      <styled.div display="flex" flexDirection="column" gap="2">
        {categories.map((cat) => (
          <CategoryScoreBar key={cat.category} cat={cat} />
        ))}
      </styled.div>
    </styled.section>
  )
}

/** Recommendation guideline name + ID line — extracted to reduce JSX nesting depth. */
const RecommendationTitle = ({ name, id }: { readonly name: string; readonly id: string }) => (
  <styled.p fontWeight="semibold" fontSize="sm" color="fg.default" mb="0.5">
    {name}{' '}
    <styled.span color="fg.muted" fontSize="xs">
      ({id})
    </styled.span>
  </styled.p>
)

/** Single recommendation card — extracted to limit JSX nesting depth. */
const RecommendationItem = ({ rec }: { readonly rec: Recommendation }) => (
  <styled.li className={cardStyles.root}>
    <styled.div display="flex" gap="2" alignItems="flex-start">
      <styled.span
        w="2"
        h="2"
        borderRadius="full"
        mt="1.5"
        flexShrink="0"
        bg={impactDot(rec.impact)}
        aria-label={`${rec.impact} impact`}
      />
      <styled.div flex="1">
        <RecommendationTitle name={rec.guidelineName} id={rec.guidelineId} />
        <styled.p fontSize="sm" color="fg.default" lineHeight="relaxed">
          {rec.recommendation}
        </styled.p>
      </styled.div>
    </styled.div>
  </styled.li>
)

/** Recommendations section. */
const RecommendationsSection = ({
  recommendations,
}: {
  readonly recommendations: ReadonlyArray<Recommendation>
}) => {
  if (recommendations.length === 0) return null
  return (
    <styled.section aria-labelledby="recommendations-heading" mb="6">
      <SectionHeading id="recommendations-heading">Recommendations</SectionHeading>
      <styled.ol listStyleType="none" m="0" p="0" display="flex" flexDirection="column" gap="3">
        {recommendations.map((rec) => (
          <RecommendationItem key={rec.guidelineId} rec={rec} />
        ))}
      </styled.ol>
    </styled.section>
  )
}

/** Export and share section — generates download links from the cached report. */
const ExportSection = ({
  id,
  report,
}: {
  readonly id: string
  readonly report: SustainabilityReport
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    try {
      const json = JSON.stringify({ id, status: 'completed', report }, null, 2)
      setDataUrl(`data:application/json;charset=utf-8,${encodeURIComponent(json)}`)
    } catch {
      setDataUrl(null)
    }
  }, [id, report])

  return (
    <styled.section aria-labelledby="export-heading" mt="6">
      <SectionHeading id="export-heading">Export &amp; Share</SectionHeading>
      {dataUrl !== null ? (
        <styled.div display="flex" gap="3" flexWrap="wrap">
          <a
            href={dataUrl}
            download={`wsg-report-${id}.json`}
            className={button({ variant: 'outline', size: 'sm' })}
          >
            Download JSON
          </a>
          <a
            href={dataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={button({ variant: 'ghost', size: 'sm' })}
            aria-label="View JSON (opens in new tab)"
          >
            View JSON
          </a>
        </styled.div>
      ) : (
        <styled.p fontSize="xs" color="fg.muted" mt="3">
          JSON export will be available once this report has fully loaded in your browser.
        </styled.p>
      )}
      <styled.p fontSize="xs" color="fg.muted" mt="3">
        Share this result:{' '}
        <code className={code({ size: 'sm' })} style={{ wordBreak: 'break-all' }}>
          {`/results/${id}`}
        </code>
      </styled.p>
    </styled.section>
  )
}

/** Methodology note section. */
const MethodologySection = ({
  methodology,
}: {
  readonly methodology: { readonly disclaimer: string; readonly coreWebVitalsNote?: string }
}) => (
  <styled.section aria-labelledby="methodology-heading" mt="6">
    <SectionHeading id="methodology-heading">Methodology</SectionHeading>
    <styled.p fontSize="sm" color="fg.default" lineHeight="relaxed">
      {methodology.disclaimer}
    </styled.p>
    {methodology.coreWebVitalsNote && (
      <styled.p fontSize="sm" color="fg.default" lineHeight="relaxed" mt="2">
        {methodology.coreWebVitalsNote}
      </styled.p>
    )}
  </styled.section>
)

// ─── Main client component ────────────────────────────────────────────────────

interface ResultsClientProps {
  readonly id: string
}

/**
 * Client component for the results page.
 *
 * Loads the report from sessionStorage first (populated by UrlInputForm after a
 * successful check), then falls back to fetching `/api/check/:id` using a
 * relative URL so no `NEXT_PUBLIC_APP_URL` env-var is needed.
 *
 * This avoids the serverless 404 caused by the in-memory store not being shared
 * across function instances (e.g. on Netlify).
 */
export const ResultsClient = ({ id }: ResultsClientProps) => {
  const resultId = parseResultId(id)

  // Lazy initialisers: read from sessionStorage on first client render to avoid
  // showing "Loading results…" when the data is already cached (typical flow
  // after a form submission).
  const [report, setReport] = useState<SustainabilityReport | null>(() => {
    if (globalThis.window === undefined || resultId === null) return null
    return readCachedResult(resultId)
  })
  const [loading, setLoading] = useState(
    () =>
      globalThis.window === undefined || (resultId !== null && readCachedResult(resultId) === null)
  )

  useEffect(() => {
    if (!loading || resultId === null) return // cache hit or invalid id

    fetchReportFromApi(resultId)
      .then((r) => setReport(r))
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [loading, resultId])

  if (loading) {
    return (
      <styled.section aria-label="Loading results" py="6" maxW="2xl" mx="auto">
        <styled.div mb="4">
          <Link href="/" className={button({ variant: 'ghost', size: 'sm' })}>
            ← New check
          </Link>
        </styled.div>
        <styled.p color="fg.default">Loading results…</styled.p>
      </styled.section>
    )
  }

  if (!report || resultId === null) {
    return (
      <styled.section aria-label="Result not found" py="6" maxW="2xl" mx="auto">
        <styled.div mb="4">
          <Link href="/" className={button({ variant: 'ghost', size: 'sm' })}>
            ← New check
          </Link>
        </styled.div>
        <styled.p color="fg.default">
          Result not found. It may have expired. Please run a new check.
        </styled.p>
      </styled.section>
    )
  }

  return (
    <styled.section aria-labelledby="results-heading" py="6" maxW="2xl" mx="auto">
      {/* Back link */}
      <styled.div mb="4">
        <Link href="/" className={button({ variant: 'ghost', size: 'sm' })}>
          ← New check
        </Link>
      </styled.div>

      <ReportHeader grade={report.grade} score={report.overallScore} url={report.url} />
      <SummarySection summary={report.summary} />
      <CategoryScoresSection categories={report.categories} />
      <RecommendationsSection recommendations={report.recommendations} />
      <CheckResultsSection checks={report.checks} />
      <ExportSection id={resultId} report={report} />
      <MethodologySection methodology={report.methodology} />
    </styled.section>
  )
}
