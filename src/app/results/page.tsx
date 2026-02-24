import type { Metadata } from 'next'
import { styled } from 'styled-system/jsx'

export const metadata: Metadata = {
  title: 'Results — WSG Check',
  description: 'Sustainability check results',
}

export default function ResultsPage() {
  return (
    <styled.section aria-labelledby="results-heading" px="4" py="6">
      <h1 id="results-heading">Results</h1>
      <p>Check results will be displayed here.</p>
    </styled.section>
  )
}
