import type { Metadata } from 'next'
import { styled } from 'styled-system/jsx'

export const metadata: Metadata = {
  title: 'About — WSG Check',
  description: 'About WSG Check — project purpose and methodology',
}

export default function AboutPage() {
  return (
    <styled.section aria-labelledby="about-heading" px="4" py="6">
      <h1 id="about-heading">About WSG Check</h1>
      <p>Project purpose, methodology, and sustainability statement will appear here.</p>
    </styled.section>
  )
}
