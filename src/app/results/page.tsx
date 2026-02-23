import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Results — WSG Check',
  description: 'Sustainability check results',
}

export default function ResultsPage() {
  return (
    <section aria-labelledby="results-heading" style={{ padding: '1.5rem 1rem' }}>
      <h1 id="results-heading">Results</h1>
      <p>Check results will be displayed here.</p>
    </section>
  )
}
