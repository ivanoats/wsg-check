import type { Metadata } from 'next'
import { styled } from 'styled-system/jsx'
import { cx, css } from 'styled-system/css'
import { link, avatar } from 'styled-system/recipes'
import { UrlInputForm } from './components/UrlInputForm'

export const metadata: Metadata = {
  title: 'WSG Check — Sustainability Checker',
  description: 'Check any website against the W3C Web Sustainability Guidelines (WSG) instantly.',
}

const stepAvatarStyles = avatar({ size: 'md' })

interface HowItWorksStepProps {
  readonly step: string
  readonly title: string
  readonly detail: string
}

/** Single how-it-works step — extracted to keep JSX nesting ≤ 5 levels. */
const HowItWorksStep = ({ step, title, detail }: HowItWorksStepProps) => (
  <styled.li display="flex" gap="3" alignItems="flex-start">
    <span
      className={cx(stepAvatarStyles.root, css({ bg: 'accent.default', flexShrink: '0' }))}
      aria-hidden="true"
    >
      <span
        className={cx(
          stepAvatarStyles.fallback,
          css({ color: 'accent.fg', fontWeight: 'bold', fontSize: 'sm' })
        )}
      >
        {step}
      </span>
    </span>
    <styled.div>
      <styled.p fontWeight="semibold" color="fg.default">
        {title}
      </styled.p>
      <styled.p fontSize="sm" color="fg.default" lineHeight="relaxed">
        {detail}
      </styled.p>
    </styled.div>
  </styled.li>
)

const HOW_IT_WORKS_STEPS = [
  {
    step: '1',
    title: 'Enter a URL',
    detail: 'Type or paste the website address you want to analyse.',
  },
  {
    step: '2',
    title: 'Run the check',
    detail: 'We analyse the page against 80+ W3C Web Sustainability Guidelines automatically.',
  },
  {
    step: '3',
    title: 'Review results',
    detail: 'See your sustainability score, category breakdown, and prioritised recommendations.',
  },
] as const

export default function Home() {
  return (
    <styled.section aria-labelledby="home-heading" py="8" maxW="2xl" mx="auto">
      <styled.h1
        id="home-heading"
        fontSize={{ base: '2xl', md: '3xl' }}
        fontWeight="bold"
        mb="2"
        color="fg.default"
      >
        WSG Check
      </styled.h1>
      <styled.p fontSize="md" color="fg.default" lineHeight="relaxed" mb="6">
        Check any website against the{' '}
        <a
          href="https://www.w3.org/TR/web-sustainability-guidelines/"
          target="_blank"
          rel="noopener noreferrer"
          className={link()}
        >
          W3C Web Sustainability Guidelines
        </a>{' '}
        .
      </styled.p>

      {/* URL input form */}
      <UrlInputForm />

      {/* Quick-start guide */}
      <styled.section aria-labelledby="how-it-works" mt="10">
        <styled.h2 id="how-it-works" fontSize="lg" fontWeight="semibold" mb="4" color="fg.default">
          How it works
        </styled.h2>
        <styled.ol listStyleType="none" m="0" p="0" display="flex" flexDirection="column" gap="4">
          {HOW_IT_WORKS_STEPS.map(({ step, title, detail }) => (
            <HowItWorksStep key={step} step={step} title={title} detail={detail} />
          ))}
        </styled.ol>
      </styled.section>
    </styled.section>
  )
}
