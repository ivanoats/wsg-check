import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — WSG Check',
  description: 'About WSG Check — project purpose and methodology',
}

export default function AboutPage() {
  return (
    <section aria-labelledby="about-heading" style={{ padding: '1.5rem 1rem' }}>
      <h1 id="about-heading">About WSG Check</h1>
      <p>Project purpose, methodology, and sustainability statement will appear here.</p>
    </section>
  )
}
