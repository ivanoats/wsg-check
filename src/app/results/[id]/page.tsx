import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { styled } from 'styled-system/jsx'
import { css } from 'styled-system/css'
import { button, card } from 'styled-system/recipes'
import type { SustainabilityReport, Recommendation, ReportSummary } from '@/report/types'
import type { CategoryScore } from '@/core/types'
import type { CheckResultLookupBody } from '@/api/types'
import { CheckResultsSection } from '@/app/components/CheckResultsSection'

interface PageProps {
  readonly params: Promise<{ readonly id: string }>
}

export const dynamic = 'force-dynamic'

const fetchReport = async (id: string): Promise<SustainabilityReport | null> => {
  try {
    const base = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
    const res = await fetch(`${base}/api/check/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    const body = (await res.json()) as CheckResultLookupBody
    return body.report
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Results ${id} — WSG Check`,
    description: 'Web sustainability check results',
  }
}

const gradeColors: Readonly<Record<string, { bg: string; fg: string }>> = {
  A: { bg: 'green.9', fg: 'white' },
  B: { bg: 'blue.9', fg: 'white' },
  C: { bg: 'amber.10', fg: 'white' },
  D: { bg: 'orange.9', fg: 'white' },
  F: { bg: 'red.9', fg: 'white' },
}

const cardStyles = card()

const gradeBadgeClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  w: '16',
  h: '16',
  borderRadius: 'full',
  fontWeight: 'bold',
  fontSize: '2xl',
  color: 'white',
  flexShrink: '0',
})

const sectionHeadingClass = css({
  fontSize: 'lg',
  fontWeight: 'semibold',
  color: 'fg.default',
  mb: '3',
})

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
    <styled.p fontSize="xs" color="fg.subtle">
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
    <styled.div
      className={gradeBadgeClass}
      bg={gradeColors[grade]?.bg ?? 'gray.7'}
      color={gradeColors[grade]?.fg ?? 'white'}
      aria-label={`Grade ${grade}`}
    >
      {grade}
    </styled.div>
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
      <styled.p fontSize="sm" color="fg.subtle" style={{ wordBreak: 'break-all' }}>
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

/** Single category score row — extracted to limit JSX nesting depth. */
const CategoryScoreBar = ({ cat }: { readonly cat: CategoryScore }) => {
  const barColor = cat.score >= 75 ? 'green.9' : cat.score >= 50 ? 'amber.9' : 'red.9'
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
      <styled.div
        h="2"
        borderRadius="full"
        bg="border.default"
        overflow="hidden"
        role="progressbar"
        aria-valuenow={cat.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${cat.category} score: ${cat.score} out of 100`}
      >
        <styled.div h="full" borderRadius="full" bg={barColor} width={`${cat.score}%`} />
      </styled.div>
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
      <h2 id="categories-heading" className={sectionHeadingClass}>
        Category Scores
      </h2>
      <styled.div display="flex" flexDirection="column" gap="2">
        {categories.map((cat) => (
          <CategoryScoreBar key={cat.category} cat={cat} />
        ))}
      </styled.div>
    </styled.section>
  )
}

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
        <styled.p fontWeight="semibold" fontSize="sm" color="fg.default" mb="0.5">
          {rec.guidelineName}{' '}
          <styled.span color="fg.subtle" fontSize="xs">
            ({rec.guidelineId})
          </styled.span>
        </styled.p>
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
      <h2 id="recommendations-heading" className={sectionHeadingClass}>
        Recommendations
      </h2>
      <styled.ol listStyleType="none" m="0" p="0" display="flex" flexDirection="column" gap="3">
        {recommendations.map((rec) => (
          <RecommendationItem key={rec.guidelineId} rec={rec} />
        ))}
      </styled.ol>
    </styled.section>
  )
}

/** Export and share section. */
const ExportSection = ({ id }: { readonly id: string }) => (
  <styled.section aria-labelledby="export-heading" mt="6">
    <h2 id="export-heading" className={sectionHeadingClass}>
      Export &amp; Share
    </h2>
    <styled.div display="flex" gap="3" flexWrap="wrap">
      <a
        href={`/api/check/${id}`}
        download={`wsg-report-${id}.json`}
        className={button({ variant: 'outline', size: 'sm' })}
      >
        Download JSON
      </a>
      <a
        href={`/api/check/${id}`}
        target="_blank"
        rel="noopener noreferrer"
        className={button({ variant: 'ghost', size: 'sm' })}
        aria-label="View JSON (opens in new tab)"
      >
        View JSON
      </a>
    </styled.div>
    <styled.p fontSize="xs" color="fg.subtle" mt="3">
      Share this result:{' '}
      <styled.code
        fontSize="xs"
        px="1"
        py="0.5"
        borderRadius="sm"
        bg="bg.subtle"
        color="fg.default"
        style={{ wordBreak: 'break-all' }}
      >
        {`/results/${id}`}
      </styled.code>
    </styled.p>
  </styled.section>
)

/** Methodology note section. */
const MethodologySection = ({
  methodology,
}: {
  readonly methodology: { readonly disclaimer: string; readonly coreWebVitalsNote?: string }
}) => (
  <styled.section aria-labelledby="methodology-heading" mt="6">
    <h2 id="methodology-heading" className={sectionHeadingClass}>
      Methodology
    </h2>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ResultsIdPage({ params }: PageProps) {
  const { id } = await params
  const report = await fetchReport(id)
  if (!report) notFound()

  return (
    <styled.section aria-labelledby="results-heading" px="4" py="6" maxW="2xl" mx="auto">
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
      <ExportSection id={id} />
      <MethodologySection methodology={report.methodology} />
    </styled.section>
  )
}
