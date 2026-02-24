import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { styled } from 'styled-system/jsx'
import { css } from 'styled-system/css'
import { button } from 'styled-system/recipes'
import { card } from 'styled-system/recipes'
import type { SustainabilityReport } from '@/report/types'
import type { CheckResultLookupBody } from '@/api/types'
import { CheckResultsSection } from '@/app/components/CheckResultsSection'

interface PageProps {
  readonly params: Promise<{ readonly id: string }>
}

export const dynamic = 'force-dynamic'

const fetchReport = async (id: string): Promise<SustainabilityReport | null> => {
  try {
    const base = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'http://localhost:3000'
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

const gradeColors: Readonly<Record<string, string>> = {
  A: '#166534',
  B: '#1e40af',
  C: '#92400e',
  D: '#b45309',
  F: '#991b1b',
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

const impactDot = (impact: string): string =>
  impact === 'high' ? '#ef4444' : impact === 'medium' ? '#f59e0b' : '#6b7280'

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

      {/* Header: score + grade */}
      <styled.div display="flex" gap="4" alignItems="center" mb="6">
        <div
          className={gradeBadgeClass}
          style={{ backgroundColor: gradeColors[report.grade] ?? '#374151' }}
          aria-label={`Grade ${report.grade}`}
        >
          {report.grade}
        </div>
        <styled.div>
          <styled.h1
            id="results-heading"
            fontSize={{ base: 'xl', md: '2xl' }}
            fontWeight="bold"
            color="fg.default"
            mb="1"
          >
            Score: {report.overallScore}/100
          </styled.h1>
          <styled.p fontSize="sm" color="fg.muted" style={{ wordBreak: 'break-all' }}>
            {report.url}
          </styled.p>
        </styled.div>
      </styled.div>

      {/* Summary counts */}
      <styled.div
        display="grid"
        gridTemplateColumns="repeat(4, 1fr)"
        gap="3"
        mb="6"
        role="list"
        aria-label="Check summary"
      >
        {[
          { label: 'Passed', count: report.summary.passed, color: '#166534' },
          { label: 'Failed', count: report.summary.failed, color: '#991b1b' },
          { label: 'Warnings', count: report.summary.warnings, color: '#92400e' },
          { label: 'N/A', count: report.summary.notApplicable, color: '#374151' },
        ].map(({ label, count, color }) => (
          <styled.div
            key={label}
            role="listitem"
            p="3"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="md"
            bg="bg.subtle"
            textAlign="center"
          >
            <styled.p fontWeight="bold" fontSize="xl" style={{ color }}>
              {count}
            </styled.p>
            <styled.p fontSize="xs" color="fg.muted">
              {label}
            </styled.p>
          </styled.div>
        ))}
      </styled.div>

      {/* Category breakdown */}
      {report.categories.length > 0 && (
        <styled.section aria-labelledby="categories-heading" mb="6">
          <h2 id="categories-heading" className={sectionHeadingClass}>
            Category Scores
          </h2>
          <styled.div display="flex" flexDirection="column" gap="2">
            {report.categories.map((cat) => (
              <styled.div key={cat.category} className={cardStyles.root}>
                <styled.div
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb="1"
                >
                  <styled.span fontSize="sm" fontWeight="medium" color="fg.default">
                    {cat.category.toUpperCase()}
                  </styled.span>
                  <styled.span fontSize="sm" fontWeight="bold" color="fg.default">
                    {cat.score}/100
                  </styled.span>
                </styled.div>
                {/* Progress bar */}
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
                  <styled.div
                    h="full"
                    borderRadius="full"
                    style={{
                      width: `${cat.score}%`,
                      backgroundColor:
                        cat.score >= 75 ? '#166534' : cat.score >= 50 ? '#92400e' : '#991b1b',
                    }}
                  />
                </styled.div>
              </styled.div>
            ))}
          </styled.div>
        </styled.section>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <styled.section aria-labelledby="recommendations-heading" mb="6">
          <h2 id="recommendations-heading" className={sectionHeadingClass}>
            Recommendations
          </h2>
          <styled.ol listStyleType="none" m="0" p="0" display="flex" flexDirection="column" gap="3">
            {report.recommendations.map((rec, i) => (
              <styled.li key={`${rec.guidelineId}-${i}`} className={cardStyles.root}>
                <styled.div display="flex" gap="2" alignItems="flex-start">
                  <styled.span
                    w="2"
                    h="2"
                    borderRadius="full"
                    mt="1.5"
                    flexShrink="0"
                    style={{ backgroundColor: impactDot(rec.impact) }}
                    aria-label={`${rec.impact} impact`}
                  />
                  <styled.div flex="1">
                    <styled.p fontWeight="semibold" fontSize="sm" color="fg.default" mb="0.5">
                      {rec.guidelineName}{' '}
                      <styled.span color="fg.muted" fontSize="xs">
                        ({rec.guidelineId})
                      </styled.span>
                    </styled.p>
                    <styled.p fontSize="sm" color="fg.muted">
                      {rec.recommendation}
                    </styled.p>
                  </styled.div>
                </styled.div>
              </styled.li>
            ))}
          </styled.ol>
        </styled.section>
      )}

      {/* Check results (grouped by category) */}
      <CheckResultsSection checks={report.checks} />

      {/* Export & share */}
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
        <styled.p fontSize="xs" color="fg.muted" mt="3">
          Share this result:{' '}
          <styled.code
            fontSize="xs"
            px="1"
            py="0.5"
            borderRadius="sm"
            bg="bg.subtle"
            style={{ wordBreak: 'break-all' }}
          >
            {`/results/${id}`}
          </styled.code>
        </styled.p>
      </styled.section>

      {/* Methodology note */}
      <styled.section aria-labelledby="methodology-heading" mt="6">
        <h2 id="methodology-heading" className={sectionHeadingClass}>
          Methodology
        </h2>
        <styled.p fontSize="sm" color="fg.muted">
          {report.methodology.disclaimer}
        </styled.p>
        {report.methodology.coreWebVitalsNote && (
          <styled.p fontSize="sm" color="fg.muted" mt="2">
            {report.methodology.coreWebVitalsNote}
          </styled.p>
        )}
      </styled.section>
    </styled.section>
  )
}
