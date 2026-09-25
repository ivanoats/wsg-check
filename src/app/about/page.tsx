import type { Metadata } from 'next'
import Link from 'next/link'
import { styled } from 'styled-system/jsx'
import { cx, css } from 'styled-system/css'
import { button, card, link } from 'styled-system/recipes'
import { SectionHeading } from '../components/SectionHeading'

export const metadata: Metadata = {
  title: 'About — WSG Check',
  description:
    'About WSG Check — why it exists, how scoring works, and how Sustainable Websites can help you act on your report.',
}

const cardStyles = card()

/*
 * Per-grade badge colours — each `css()` call uses a *literal* object so
 * Panda's static extractor generates the utility classes (bg_green.9, etc.)
 * at build time. Dynamic `bg={variable}` props are NOT extracted by Panda,
 * which is why CSS-variable or dynamic-prop approaches left circles invisible.
 */
const gradeCircleBase = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  w: '10',
  h: '10',
  borderRadius: 'full',
  fontWeight: 'bold',
  fontSize: 'lg',
  flexShrink: '0',
})

const gradeCircleColor: Readonly<Record<string, string>> = {
  A: css({ bg: 'green.9', color: 'white' }), // green.9 in Park UI preset ✓
  B: css({ bg: '[#0055b3]', color: 'white' }), // blue.9 token absent → arbitrary hex (≈7.1:1)
  C: css({ bg: '[#ffb224]', color: '[#4d2000]' }), // amber.9/12 absent → arbitrary hex (≈7.1:1)
  D: css({ bg: '[#ad4800]', color: 'white' }), // orange.9 token absent → arbitrary hex (≈5.7:1)
  F: css({ bg: '[#c7272d]', color: 'white' }), // darker red than Panda's red.9 (≈5.6:1)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface GradeScaleItemProps {
  readonly grade: string
  readonly range: string
}

/** Single grade-scale card — extracted to limit JSX nesting depth. */
const GradeScaleItem = ({ grade, range }: GradeScaleItemProps) => (
  <styled.div
    role="listitem"
    className={cardStyles.root}
    display="flex"
    gap="3"
    alignItems="center"
  >
    <span className={cx(gradeCircleBase, gradeCircleColor[grade] ?? '')} aria-hidden="true">
      {grade}
    </span>
    <styled.div>
      <styled.p fontWeight="semibold" fontSize="sm" color="fg.default">
        Grade {grade}
      </styled.p>
      <styled.p fontSize="xs" color="fg.muted">
        Score {range}
      </styled.p>
    </styled.div>
  </styled.div>
)

const GRADE_SCALE = [
  { grade: 'A', range: '90–100' },
  { grade: 'B', range: '75–89' },
  { grade: 'C', range: '60–74' },
  { grade: 'D', range: '45–59' },
  { grade: 'F', range: '0–44' },
] as const

/** Purpose & Methodology section. */
const PurposeSection = () => (
  <styled.section aria-labelledby="purpose-heading" mb="8">
    <SectionHeading id="purpose-heading">Purpose &amp; Methodology</SectionHeading>
    <styled.p fontSize="sm" color="fg.muted" mb="3">
      WSG Check analyses a web page&apos;s HTML and HTTP responses against 80+ automated and
      semi-automated checks derived from the W3C Web Sustainability Guidelines. Each check maps to a
      specific guideline and provides a pass, fail, warn, or info result along with an actionable
      recommendation.
    </styled.p>
    <styled.p fontSize="sm" color="fg.muted">
      Because WSG Check uses static analysis only (no headless browser), some checks that require
      JavaScript execution or network timing — such as Core Web Vitals — are out of scope. Those are
      flagged in every report with links to complementary tools like{' '}
      <a
        href="https://pagespeed.web.dev/"
        target="_blank"
        rel="noopener noreferrer"
        className={link()}
      >
        Google PageSpeed Insights
      </a>{' '}
      .
    </styled.p>
  </styled.section>
)

/** Scoring methodology section. */
const ScoringSection = () => (
  <styled.section aria-labelledby="scoring-heading" mb="8">
    <SectionHeading id="scoring-heading">How Scoring Works</SectionHeading>
    <styled.p fontSize="sm" color="fg.muted" mb="4">
      Each check contributes a score of 0–100, weighted by impact (high, medium, low). The overall
      sustainability score is a weighted average across all scored checks. Checks with status{' '}
      <em>info</em> or <em>not-applicable</em> are excluded from the average.
    </styled.p>
    <styled.div
      display="grid"
      gridTemplateColumns="repeat(2, 1fr)"
      gap="3"
      role="list"
      aria-label="Grade scale"
    >
      {GRADE_SCALE.map(({ grade, range }) => (
        <GradeScaleItem key={grade} grade={grade} range={range} />
      ))}
    </styled.div>
  </styled.section>
)

/** Sustainability statement section. */
const SustainabilitySection = () => (
  <styled.section aria-labelledby="sustainability-heading" mb="8">
    <SectionHeading id="sustainability-heading">Sustainability Statement</SectionHeading>
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
      <li>Zero third-party JavaScript on the frontend (Park UI + PandaCSS generate static CSS)</li>
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
)

/** Why I built WSG Check — the author's motivation. */
const WhyIBuiltItSection = () => (
  <styled.section aria-labelledby="why-heading" mb="8">
    <SectionHeading id="why-heading">Why I Built WSG Check</SectionHeading>
    <styled.p fontSize="sm" color="fg.muted" mb="3">
      The W3C Web Sustainability Guidelines are thorough, but they read like a standard, not a to-do
      list. Most teams I talk to agree that a lighter web is a better web, then stall on the
      question of where to start. Carbon calculators hand out a score without a fix, and performance
      tools measure speed without saying which guideline a problem maps to.
    </styled.p>
    <styled.p fontSize="sm" color="fg.muted">
      I wanted the sustainability equivalent of an accessibility linter: something that runs in
      seconds, points at specific success criteria, and tells you what to change. WSG Check is that
      tool. It is open source so that anyone can see exactly how a score is calculated, and it runs
      as a website, a CLI, and a CI step so the checks can live where the work happens.
    </styled.p>
  </styled.section>
)

/** Who I am — author bio. */
const WhoIAmSection = () => (
  <styled.section aria-labelledby="who-heading" mb="8">
    <SectionHeading id="who-heading">Who I Am</SectionHeading>
    <styled.p fontSize="sm" color="fg.muted" mb="3">
      I&rsquo;m Ivan Storck, a software architect in Seattle. By day I am a Senior Solutions
      Architect at lululemon, working on content management, design systems, and brand technology.
      Before that I co-founded Code Fellows, taught Ruby and JavaScript to several hundred bootcamp
      students, and spent six years on the teaching faculty of the University of Washington&rsquo;s
      Rails certificate program.
    </styled.p>
    <styled.p fontSize="sm" color="fg.muted">
      Outside of that I take a small number of fractional CTO engagements and build sustainability
      tooling for the web. More of my work is at{' '}
      <a href="https://ivanstorck.com" target="_blank" rel="noopener noreferrer" className={link()}>
        ivanstorck.com
      </a>
      .
    </styled.p>
  </styled.section>
)

/** Call to action — Sustainable Websites. */
const SustainableWebsitesSection = () => (
  <styled.section
    aria-labelledby="help-heading"
    mb="8"
    className={cardStyles.root}
    p="5"
    borderWidth="1px"
    borderColor="border.default"
  >
    <SectionHeading id="help-heading">Want Help Acting on Your Report?</SectionHeading>
    <styled.p fontSize="sm" color="fg.muted" mb="3">
      A report tells you what to fix. Doing the fixing, while keeping design, content, and business
      goals intact, is the harder part. Through{' '}
      <a
        href="https://sustainablewebsites.com"
        target="_blank"
        rel="noopener noreferrer"
        className={link()}
      >
        Sustainable Websites
      </a>
      , I help teams turn WSG Check findings into a prioritised plan and then into lighter, faster,
      lower-carbon sites.
    </styled.p>
    <styled.p fontSize="sm" color="fg.muted" mb="4">
      If your score was lower than you hoped, or you need to show progress against the W3C
      guidelines, let&rsquo;s talk.
    </styled.p>
    <a
      href="https://sustainablewebsites.com"
      target="_blank"
      rel="noopener noreferrer"
      className={button({ size: 'md' })}
    >
      Visit SustainableWebsites.com ↗
    </a>
  </styled.section>
)

/** Resources and links section. */
const ResourcesSection = () => (
  <styled.section aria-labelledby="links-heading" mb="6">
    <SectionHeading id="links-heading">Resources</SectionHeading>
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
)

export default function AboutPage() {
  return (
    <styled.section aria-labelledby="about-heading" py="6" maxW="2xl" mx="auto">
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
        </a>{' '}
        .
      </styled.p>

      <PurposeSection />
      <WhyIBuiltItSection />
      <SustainableWebsitesSection />
      <ScoringSection />
      <SustainabilitySection />
      <WhoIAmSection />
      <ResourcesSection />
    </styled.section>
  )
}
