import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ResultsClient } from './ResultsClient'

const RESULT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface PageProps {
  readonly params: Promise<{ readonly id: string }>
}

export const metadata: Metadata = {
  title: 'Results — WSG Check',
  description: 'Web sustainability check results',
}

export default async function ResultsIdPage({ params }: PageProps) {
  const { id } = await params
  if (!RESULT_ID_PATTERN.test(id.trim())) {
    notFound()
  }
  return <ResultsClient id={id} />
}
