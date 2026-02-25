import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CheckResultsSection } from '@/app/components/CheckResultsSection'
import type { CheckResult } from '@/core/types'

vi.mock('next/link')
vi.mock('next/navigation')

const makeCheck = (overrides: Partial<CheckResult> = {}): CheckResult => ({
  guidelineId: '3.1',
  guidelineName: 'Minify Your HTML',
  successCriterion: 'HTML is minified',
  status: 'pass',
  score: 100,
  message: 'HTML appears minified.',
  impact: 'medium',
  category: 'web-dev',
  machineTestable: true,
  ...overrides,
})

const SAMPLE_CHECKS: ReadonlyArray<CheckResult> = [
  makeCheck({
    guidelineId: '3.1',
    guidelineName: 'Minify Your HTML',
    status: 'pass',
    category: 'web-dev',
  }),
  makeCheck({
    guidelineId: '3.2',
    guidelineName: 'Compress Images',
    status: 'fail',
    category: 'web-dev',
    message: 'Uncompressed images detected.',
  }),
  makeCheck({
    guidelineId: '2.1',
    guidelineName: 'Alt text',
    status: 'warn',
    category: 'ux',
    message: 'Some images lack alt text.',
  }),
]

describe('CheckResultsSection', () => {
  it('renders nothing when checks array is empty', () => {
    const { container } = render(<CheckResultsSection checks={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the section heading', () => {
    render(<CheckResultsSection checks={SAMPLE_CHECKS} />)
    expect(screen.getByRole('heading', { name: /check results/i })).toBeDefined()
  })

  it('renders one collapsible trigger button per category', () => {
    render(<CheckResultsSection checks={SAMPLE_CHECKS} />)
    // Two categories: web-dev and ux
    const triggers = screen.getAllByRole('button')
    expect(triggers.length).toBeGreaterThanOrEqual(2)
  })

  it('shows category labels in trigger buttons', () => {
    render(<CheckResultsSection checks={SAMPLE_CHECKS} />)
    expect(screen.getByText(/web-dev/i)).toBeDefined()
    expect(screen.getByText(/ux/i)).toBeDefined()
  })

  it('groups are collapsed by default (aria-expanded=false on all triggers)', () => {
    render(<CheckResultsSection checks={SAMPLE_CHECKS} />)
    const triggers = screen.getAllByRole('button')
    triggers.forEach((t) => {
      expect(t.getAttribute('aria-expanded')).toBe('false')
    })
  })

  it('expands a group when its trigger is clicked (aria-expanded becomes true)', async () => {
    render(<CheckResultsSection checks={SAMPLE_CHECKS} />)
    const webDevButton = screen.getByRole('button', { name: /toggle web-dev/i })
    expect(webDevButton.getAttribute('aria-expanded')).toBe('false')
    await act(async () => {
      fireEvent.focus(webDevButton) // transition Accordion machine to 'focused' state
      fireEvent.click(webDevButton)
    })
    expect(webDevButton.getAttribute('aria-expanded')).toBe('true')
  })

  it('other groups remain collapsed when one group is expanded', async () => {
    render(<CheckResultsSection checks={SAMPLE_CHECKS} />)
    const webDevButton = screen.getByRole('button', { name: /toggle web-dev/i })
    await act(async () => {
      fireEvent.focus(webDevButton)
      fireEvent.click(webDevButton)
    })
    expect(webDevButton.getAttribute('aria-expanded')).toBe('true')
    // web-dev is now open, ux should still be closed
    const uxButton = screen.getByRole('button', { name: /toggle ux/i })
    expect(uxButton.getAttribute('aria-expanded')).toBe('false')
  })

  it('renders pass/fail/warn status badge labels in the DOM', () => {
    // Ark UI Collapsible always renders content in DOM (CSS-hidden when closed)
    render(<CheckResultsSection checks={SAMPLE_CHECKS} />)
    expect(screen.getByText('Pass')).toBeDefined()
    expect(screen.getByText('Fail')).toBeDefined()
    expect(screen.getByText('Warn')).toBeDefined()
  })

  it('renders guideline IDs in the DOM', () => {
    render(<CheckResultsSection checks={SAMPLE_CHECKS} />)
    expect(screen.getByText('(3.1)')).toBeDefined()
    expect(screen.getByText('(3.2)')).toBeDefined()
  })

  it('renders the count of passes in the trigger summary', () => {
    render(<CheckResultsSection checks={SAMPLE_CHECKS} />)
    // web-dev group: 1 pass, 1 fail
    expect(screen.getByText(/✓ 1/)).toBeDefined()
    expect(screen.getByText(/✗ 1/)).toBeDefined()
  })

  it('does not emit a duplicate-key warning when two checks share the same guidelineId', () => {
    const consoleSpy = vi.spyOn(console, 'error')
    const duplicateIdChecks: ReadonlyArray<CheckResult> = [
      makeCheck({
        guidelineId: '3.17',
        guidelineName: 'Expected Files',
        successCriterion: 'Pages should link to a favicon, a web app manifest, and a sitemap',
        status: 'pass',
        category: 'web-dev',
      }),
      makeCheck({
        guidelineId: '3.17',
        guidelineName: 'Beneficial Files',
        successCriterion: 'Sites should provide a robots.txt, humans.txt, and security.txt',
        status: 'warn',
        category: 'web-dev',
      }),
    ]
    render(<CheckResultsSection checks={duplicateIdChecks} />)
    const duplicateKeyWarning = consoleSpy.mock.calls.some((args) =>
      String(args[0]).includes('same key')
    )
    expect(duplicateKeyWarning).toBe(false)
    consoleSpy.mockRestore()
  })
})
