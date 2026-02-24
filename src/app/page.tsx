import type { Metadata } from 'next'
import { styled } from 'styled-system/jsx'
import { css } from 'styled-system/css'
import { link } from 'styled-system/recipes'
import { UrlInputForm } from './components/UrlInputForm'

export const metadata: Metadata = {
  title: 'WSG Check — Sustainability Checker',
  description: 'Check any website against the W3C Web Sustainability Guidelines (WSG) instantly.',
}

const stepBadgeClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  w: '8',
  h: '8',
  borderRadius: 'full',
  bg: 'accent.default',
  color: 'accent.fg',
  fontWeight: 'bold',
  fontSize: 'sm',
  flexShrink: '0',
})

export default function Home() {
  return (
    <styled.section aria-labelledby="home-heading" px="4" py="6" maxW="2xl" mx="auto">
      <styled.h1
        id="home-heading"
        fontSize={{ base: '2xl', md: '3xl' }}
        fontWeight="bold"
        mb="2"
        color="fg.default"
      >
        WSG Check
      </styled.h1>
      <styled.p fontSize="md" color="fg.muted" mb="6">
        Check any website against the{' '}
        <a
          href="https://www.w3.org/TR/web-sustainability-guidelines/"
          target="_blank"
          rel="noopener noreferrer"
          className={link()}
        >
          W3C Web Sustainability Guidelines
        </a>
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
          {[
            {
              step: '1',
              title: 'Enter a URL',
              detail: 'Type or paste the website address you want to analyse.',
            },
            {
              step: '2',
              title: 'Run the check',
              detail:
                'We analyse the page against 80+ W3C Web Sustainability Guidelines automatically.',
            },
            {
              step: '3',
              title: 'Review results',
              detail:
                'See your sustainability score, category breakdown, and prioritised recommendations.',
            },
          ].map(({ step, title, detail }) => (
            <styled.li key={step} display="flex" gap="3" alignItems="flex-start">
              <span className={stepBadgeClass} aria-hidden="true">
                {step}
              </span>
              <styled.div>
                <styled.p fontWeight="semibold" color="fg.default">
                  {title}
                </styled.p>
                <styled.p fontSize="sm" color="fg.muted">
                  {detail}
                </styled.p>
              </styled.div>
            </styled.li>
          ))}
        </styled.ol>
      </styled.section>
    </styled.section>
  )
}
