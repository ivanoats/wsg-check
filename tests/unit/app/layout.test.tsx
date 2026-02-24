import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Activate manual mocks
vi.mock('next/link')
vi.mock('next/navigation')
vi.mock('next/font/google')

// Stub sub-components to keep the layout test focused
vi.mock('@/app/components/Header', () => ({
  Header: () => <header data-testid="header" />,
}))
vi.mock('@/app/components/BottomNav', () => ({
  BottomNav: () => <nav data-testid="bottom-nav" />,
}))

// Import after mocks are set up
const { default: RootLayout, metadata, viewport } = await import('@/app/layout')

describe('RootLayout — metadata exports', () => {
  it('exports a title for the site', () => {
    expect(metadata.title).toBe('WSG Check')
  })

  it('exports a description for the site', () => {
    expect(metadata.description).toContain('W3C Web Sustainability Guidelines')
  })
})

describe('RootLayout — viewport export', () => {
  it('sets width to device-width', () => {
    expect(viewport.width).toBe('device-width')
  })

  it('sets initialScale to 1', () => {
    expect(viewport.initialScale).toBe(1)
  })

  it('does not restrict user scaling (WCAG 1.4.4)', () => {
    // maximumScale and userScalable must be absent so users can zoom freely
    expect((viewport as Record<string, unknown>).maximumScale).toBeUndefined()
    expect((viewport as Record<string, unknown>).userScalable).toBeUndefined()
  })
})

describe('RootLayout — rendered output', () => {
  it('renders skip link to main content (WCAG 2.4.1)', () => {
    render(
      <RootLayout>
        <p>test content</p>
      </RootLayout>
    )
    const skip = screen.getByText('Skip to main content')
    expect(skip.tagName).toBe('A')
    expect((skip as HTMLAnchorElement).getAttribute('href')).toBe('#main-content')
  })

  it('renders main landmark with tabIndex -1 (skip-link focus target)', () => {
    const { container } = render(
      <RootLayout>
        <p>test content</p>
      </RootLayout>
    )
    const main = container.querySelector('main')
    expect(main?.getAttribute('id')).toBe('main-content')
    expect(main?.getAttribute('tabindex')).toBe('-1')
  })

  it('renders noscript progressive-enhancement message', () => {
    const { container } = render(
      <RootLayout>
        <p>test content</p>
      </RootLayout>
    )
    // noscript is present in the DOM (content is script-parsed by jsdom, so innerHTML
    // appears empty in a scripting-on environment — existence is what matters for a11y)
    const noscript = container.querySelector('noscript')
    expect(noscript).not.toBeNull()
  })

  it('html element carries the Inter CSS variable class', () => {
    render(
      <RootLayout>
        <p>test content</p>
      </RootLayout>
    )
    // layout applies inter.variable (the CSS custom-property name) to <html>
    // The mock returns variable: '--font-inter'
    expect(document.documentElement.className).toContain('--font-inter')
  })

  it('sets lang="en" on the html element', () => {
    const { container } = render(
      <RootLayout>
        <p>test content</p>
      </RootLayout>
    )
    // When rendered in jsdom, the html element in the test document gets lang
    const html = container.closest('html')
    expect(html?.getAttribute('lang')).toBe('en')
  })
})
