import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GuidelinesFilter } from '@/app/components/GuidelinesFilter'
import type { GuidelineEntry } from '@/config/types'

vi.mock('next/link')
vi.mock('next/navigation')

const SAMPLE_GUIDELINES: ReadonlyArray<GuidelineEntry> = [
  {
    id: '2.1',
    title: 'Undertake Systemic Impacts Mapping',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description: 'Identify environmental and social impacts.',
  },
  {
    id: '3.1',
    title: 'Minify Your HTML, CSS, and JavaScript',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description: 'Reduce asset sizes via minification.',
  },
  {
    id: '4.1',
    title: 'Use a Content Delivery Network',
    section: 'Hosting',
    category: 'hosting',
    testability: 'semi-automated',
    description: 'Serve content from nodes close to users.',
  },
]

describe('GuidelinesFilter', () => {
  it('renders all guidelines by default', () => {
    render(<GuidelinesFilter guidelines={SAMPLE_GUIDELINES} />)
    expect(screen.getByText('Undertake Systemic Impacts Mapping')).toBeDefined()
    expect(screen.getByText('Minify Your HTML, CSS, and JavaScript')).toBeDefined()
    expect(screen.getByText('Use a Content Delivery Network')).toBeDefined()
  })

  it('shows the correct total count', () => {
    render(<GuidelinesFilter guidelines={SAMPLE_GUIDELINES} />)
    expect(screen.getByText(/showing 3 of 3 guidelines/i)).toBeDefined()
  })

  it('filters by text search in title', async () => {
    render(<GuidelinesFilter guidelines={SAMPLE_GUIDELINES} />)
    fireEvent.change(screen.getByRole('searchbox', { name: /search guidelines/i }), {
      target: { value: 'minify' },
    })
    await waitFor(() => {
      expect(screen.queryByText('Undertake Systemic Impacts Mapping')).toBeNull()
      expect(screen.getByText('Minify Your HTML, CSS, and JavaScript')).toBeDefined()
      expect(screen.getByText(/showing 1 of 3/i)).toBeDefined()
    })
  })

  it('filters by category', async () => {
    render(<GuidelinesFilter guidelines={SAMPLE_GUIDELINES} />)
    fireEvent.change(screen.getByRole('combobox', { name: /filter by category/i }), {
      target: { value: 'hosting' },
    })
    await waitFor(() => {
      expect(screen.queryByText('Undertake Systemic Impacts Mapping')).toBeNull()
      expect(screen.getByText('Use a Content Delivery Network')).toBeDefined()
      expect(screen.getByText(/showing 1 of 3/i)).toBeDefined()
    })
  })

  it('filters by testability', async () => {
    render(<GuidelinesFilter guidelines={SAMPLE_GUIDELINES} />)
    fireEvent.change(screen.getByRole('combobox', { name: /filter by testability/i }), {
      target: { value: 'automated' },
    })
    await waitFor(() => {
      expect(screen.queryByText('Undertake Systemic Impacts Mapping')).toBeNull()
      expect(screen.getByText('Minify Your HTML, CSS, and JavaScript')).toBeDefined()
      expect(screen.getByText(/showing 1 of 3/i)).toBeDefined()
    })
  })

  it('shows no-results message when filters produce empty list', async () => {
    render(<GuidelinesFilter guidelines={SAMPLE_GUIDELINES} />)
    fireEvent.change(screen.getByRole('searchbox', { name: /search guidelines/i }), {
      target: { value: 'xyzzy-no-match-9999' },
    })
    await waitFor(() => {
      expect(screen.getByText(/no guidelines match your filters/i)).toBeDefined()
    })
  })

  it('renders guideline IDs', () => {
    render(<GuidelinesFilter guidelines={SAMPLE_GUIDELINES} />)
    expect(screen.getByText('2.1')).toBeDefined()
    expect(screen.getByText('3.1')).toBeDefined()
    expect(screen.getByText('4.1')).toBeDefined()
  })

  it('renders a W3C spec link when specUrl is present', () => {
    const withSpecUrl = [
      {
        ...SAMPLE_GUIDELINES[0],
        specUrl: 'https://www.w3.org/TR/web-sustainability-guidelines/#2.1',
      },
    ]
    render(<GuidelinesFilter guidelines={withSpecUrl} />)
    const link = screen.getByRole('link', { name: /w3c spec for guideline 2\.1/i })
    expect((link as HTMLAnchorElement).href).toContain('w3.org')
  })
})
