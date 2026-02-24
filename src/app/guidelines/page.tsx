import type { Metadata } from 'next'
import { styled } from 'styled-system/jsx'

export const metadata: Metadata = {
  title: 'Guidelines — WSG Check',
  description: 'Browse W3C Web Sustainability Guidelines',
}

export default function GuidelinesPage() {
  return (
    <styled.section aria-labelledby="guidelines-heading" px="4" py="6">
      <h1 id="guidelines-heading">Guidelines</h1>
      <p>A browsable list of all WSG guidelines will appear here.</p>
    </styled.section>
  )
}
