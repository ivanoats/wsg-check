import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomNav } from '@/app/components/BottomNav'

// Activates the shared manual mock at __mocks__/next/link.tsx
vi.mock('next/link')

describe('BottomNav', () => {
  it('renders a navigation landmark with accessible name', () => {
    render(<BottomNav />)
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(nav).toBeDefined()
  })

  it('renders all four navigation items', () => {
    render(<BottomNav />)
    expect(screen.getByText('Check')).toBeDefined()
    expect(screen.getByText('Results')).toBeDefined()
    expect(screen.getByText('Guidelines')).toBeDefined()
    expect(screen.getByText('About')).toBeDefined()
  })

  it('all nav links have accessible labels', () => {
    render(<BottomNav />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(4)
    links.forEach((link) => {
      expect(link.getAttribute('aria-label')).not.toBeNull()
    })
  })

  it('all nav links point to correct routes', () => {
    render(<BottomNav />)
    const hrefs = screen.getAllByRole('link').map((l) => (l as HTMLAnchorElement).href)
    expect(hrefs.some((h) => h.endsWith('/'))).toBe(true)
    expect(hrefs.some((h) => h.includes('/results'))).toBe(true)
    expect(hrefs.some((h) => h.includes('/guidelines'))).toBe(true)
    expect(hrefs.some((h) => h.includes('/about'))).toBe(true)
  })

  it('decorative SVG icons are hidden from assistive technology', () => {
    const { container } = render(<BottomNav />)
    const svgs = container.querySelectorAll('svg')
    svgs.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true')
      expect(svg.getAttribute('focusable')).toBe('false')
    })
  })

  it('nav has CSS classes applied for fixed overlay positioning', () => {
    const { container } = render(<BottomNav />)
    const nav = container.querySelector('nav')
    // PandaCSS applies atomic CSS classes — the className will be non-empty
    expect(nav?.className.length).toBeGreaterThan(0)
  })
})
