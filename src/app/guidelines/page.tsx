import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Guidelines — WSG Check',
  description: 'Browse W3C Web Sustainability Guidelines',
}

export default function GuidelinesPage() {
  return (
    <section aria-labelledby="guidelines-heading" style={{ padding: '1.5rem 1rem' }}>
      <h1 id="guidelines-heading">Guidelines</h1>
      <p>A browsable list of all WSG guidelines will appear here.</p>
    </section>
  )
}
