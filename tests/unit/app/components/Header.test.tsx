import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from '@/app/components/Header'

// Mock next/link to a plain <a> in the test environment
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('Header', () => {
  it('renders a banner landmark', () => {
    render(<Header />)
    const header = screen.getByRole('banner')
    expect(header).toBeDefined()
  })

  it('contains a link to the home page with accessible label', () => {
    render(<Header />)
    const link = screen.getByRole('link', { name: /wsg check/i })
    expect(link).toBeDefined()
    expect((link as HTMLAnchorElement).href).toContain('/')
  })

  it('displays the site name text', () => {
    render(<Header />)
    expect(screen.getByText('WSG Check')).toBeDefined()
  })

  it('decorative SVG icon is hidden from assistive technology', () => {
    const { container } = render(<Header />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('focusable')).toBe('false')
  })
})
