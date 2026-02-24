import type { Metadata } from 'next'
import Link from 'next/link'
import { styled } from 'styled-system/jsx'
import { css } from 'styled-system/css'
import { button, card, link } from 'styled-system/recipes'

export const metadata: Metadata = {
  title: 'About — WSG Check',
  description:
    'About WSG Check — project purpose, scoring methodology, and sustainability statement.',
}

const cardStyles = card()

const sectionHeadingClass = css({
  fontSize: 'lg',
  fontWeight: 'semibold',
  color: 'fg.default',
  mb: '3',
})

// ─── Sub-components ───────────────────────────────────────────────────────────

interface GradeScaleItemProps {
  readonly grade: string
  readonly range: string
  readonly bg: string
  readonly fg: string
}

/** Single grade-scale card — extracted to limit JSX nesting depth. */
const GradeScaleItem = ({ grade, range, bg, fg }: GradeScaleItemProps) => (
  <styled.div
    role="listitem"
    className={cardStyles.root}
    display="flex"
    gap="3"
    alignItems="center"
  >
    <styled.span
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      w="10"
      h="10"
      borderRadius="full"
      fontWeight="bold"
      fontSize="lg"
      bg={bg}
      color={fg}
      flexShrink="0"
      aria-hidden="true"
    >
      {grade}
    </styled.span>
    <styled.div>
      <styled.p fontWeight="semibold" fontSize="sm" color="fg.default">
        Grade {grade}
      </styled.p>
      <styled.p fontSize="xs" color="fg.subtle">
        Score {range}
      </styled.p>
    </styled.div>
  </styled.div>
)

const GRADE_SCALE = [
  { grade: 'A', range: '90–100', bg: 'green.9', fg: 'white' },
  { grade: 'B', range: '75–89', bg: 'blue.9', fg: 'white' },
  { grade: 'C', range: '60–74', bg: 'amber.10', fg: 'white' },
  { grade: 'D', range: '45–59', bg: 'orange.9', fg: 'white' },
  { grade: 'F', range: '0–44', bg: 'red.9', fg: 'white' },
] as const

export default function AboutPage() {
  return (
    <styled.section aria-labelledby="about-heading" px="4" py="6" maxW="2xl" mx="auto">
      <styled.h1
        id="about-heading"
        fontSize={{ base: '2xl', md: '3xl' }}
        fontWeight="bold"
        mb="2"
        color="fg.default"
      >
        About WSG Check
      </styled.h1>
      <styled.p fontSize="md" color="fg.default" lineHeight="relaxed" mb="8">
        An open-source tool for evaluating websites against the{' '}
        <a
          href="https://www.w3.org/TR/web-sustainability-guidelines/"
          target="_blank"
          rel="noopener noreferrer"
          className={link()}
        >
          W3C Web Sustainability Guidelines (WSG)
        </a>
        .
      </styled.p>

      {/* Purpose */}
      <styled.section aria-labelledby="purpose-heading" mb="8">
        <h2 id="purpose-heading" className={sectionHeadingClass}>
          Purpose &amp; Methodology
        </h2>
        <styled.p fontSize="sm" color="fg.muted" mb="3">
          WSG Check analyses a web page&apos;s HTML and HTTP responses against 80+ automated and
          semi-automated checks derived from the W3C Web Sustainability Guidelines. Each check maps
          to a specific guideline and provides a pass, fail, warn, or info result along with an
          actionable recommendation.
        </styled.p>
        <styled.p fontSize="sm" color="fg.muted">
          Because WSG Check uses static analysis only (no headless browser), some checks that
          require JavaScript execution or network timing — such as Core Web Vitals — are out of
          scope. Those are flagged in every report with links to complementary tools like{' '}
          <a
            href="https://pagespeed.web.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className={link()}
          >
            Google PageSpeed Insights
          </a>
          .
        </styled.p>
      </styled.section>

      {/* Scoring */}
      <styled.section aria-labelledby="scoring-heading" mb="8">
        <h2 id="scoring-heading" className={sectionHeadingClass}>
          How Scoring Works
        </h2>
        <styled.p fontSize="sm" color="fg.muted" mb="4">
          Each check contributes a score of 0–100, weighted by impact (high, medium, low). The
          overall sustainability score is a weighted average across all scored checks. Checks with
          status <em>info</em> or <em>not-applicable</em> are excluded from the average.
        </styled.p>
        <styled.div
          display="grid"
          gridTemplateColumns="repeat(2, 1fr)"
          gap="3"
          role="list"
          aria-label="Grade scale"
        >
          {GRADE_SCALE.map(({ grade, range, color }) => (
            <GradeScaleItem key={grade} grade={grade} range={range} color={color} />
          ))}
        </styled.div>
      </styled.section>

      {/* Sustainability statement */}
      <styled.section aria-labelledby="sustainability-heading" mb="8">
        <h2 id="sustainability-heading" className={sectionHeadingClass}>
          Sustainability Statement
        </h2>
        <styled.p fontSize="sm" color="fg.muted" mb="3">
          WSG Check is itself designed to minimise environmental impact:
        </styled.p>
        <styled.ul
          listStyleType="disc"
          pl="5"
          display="flex"
          flexDirection="column"
          gap="1"
          fontSize="sm"
          color="fg.muted"
          mb="3"
        >
          <li>Static analysis only — no headless browser, no Chromium binary</li>
          <li>
            Zero third-party JavaScript on the frontend (Park UI + PandaCSS generate static CSS)
          </li>
          <li>Server-side rendering for fast initial load with minimal client-side hydration</li>
          <li>In-memory result store with automatic TTL eviction (no database)</li>
          <li>
            Follows{' '}
            <a
              href="https://www.w3.org/TR/web-sustainability-guidelines/"
              target="_blank"
              rel="noopener noreferrer"
              className={link()}
            >
              W3C Web Sustainability Guidelines
            </a>{' '}
            in its own implementation
          </li>
        </styled.ul>
      </styled.section>

      {/* Links */}
      <styled.section aria-labelledby="links-heading" mb="6">
        <h2 id="links-heading" className={sectionHeadingClass}>
          Resources
        </h2>
        <styled.div display="flex" gap="3" flexWrap="wrap">
          <a
            href="https://www.w3.org/TR/web-sustainability-guidelines/"
            target="_blank"
            rel="noopener noreferrer"
            className={button({ variant: 'outline', size: 'sm' })}
          >
            WSG Specification ↗
          </a>
          <a
            href="https://github.com/ivanoats/wsg-check"
            target="_blank"
            rel="noopener noreferrer"
            className={button({ variant: 'ghost', size: 'sm' })}
          >
            GitHub ↗
          </a>
          <Link href="/guidelines" className={button({ variant: 'ghost', size: 'sm' })}>
            Browse Guidelines
          </Link>
        </styled.div>
      </styled.section>
    </styled.section>
  )
}
