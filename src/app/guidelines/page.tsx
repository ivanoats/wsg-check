import type { Metadata } from 'next'
import { styled } from 'styled-system/jsx'
import { link } from 'styled-system/recipes'
import { GUIDELINES_REGISTRY } from '@/config/guidelines-registry'
import { GuidelinesFilter } from '../components/GuidelinesFilter'

export const metadata: Metadata = {
  title: 'Guidelines — WSG Check',
  description:
    'Browse all W3C Web Sustainability Guidelines with filtering by category and testability.',
}

export default function GuidelinesPage() {
  return (
    <styled.section aria-labelledby="guidelines-heading" px="4" py="6" maxW="2xl" mx="auto">
      <styled.h1
        id="guidelines-heading"
        fontSize={{ base: '2xl', md: '3xl' }}
        fontWeight="bold"
        mb="2"
        color="fg.default"
      >
        W3C Web Sustainability Guidelines
      </styled.h1>
      <styled.p fontSize="md" color="fg.muted" mb="6">
        Browse all {GUIDELINES_REGISTRY.length} guidelines from the{' '}
        <a
          href="https://www.w3.org/TR/web-sustainability-guidelines/"
          target="_blank"
          rel="noopener noreferrer"
          className={link()}
        >
          W3C Web Sustainability Guidelines
        </a>
        . Filter by category, testability level, or search by keyword.
      </styled.p>

      <GuidelinesFilter guidelines={GUIDELINES_REGISTRY} />
    </styled.section>
  )
}
