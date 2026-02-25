import type { Metadata } from 'next'
import { ResultsClient } from './ResultsClient'

interface PageProps {
  readonly params: Promise<{ readonly id: string }>
}

export const metadata: Metadata = {
  title: 'Results — WSG Check',
  description: 'Web sustainability check results',
}

export default async function ResultsIdPage({ params }: PageProps) {
  const { id } = await params
  return <ResultsClient id={id} />
}
