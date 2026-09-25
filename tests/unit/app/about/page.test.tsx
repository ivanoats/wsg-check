import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AboutPage from '@/app/about/page'

// Activates the shared manual mock at __mocks__/next/link.tsx
vi.mock('next/link')

describe('AboutPage', () => {
  it('explains why WSG Check was built', () => {
    render(<AboutPage />)
    expect(screen.getByRole('heading', { name: /why i built wsg check/i })).toBeDefined()
  })

  it('includes an author bio', () => {
    render(<AboutPage />)
    expect(screen.getByRole('heading', { name: /who i am/i })).toBeDefined()
    expect(screen.getByText(/Ivan Storck/)).toBeDefined()
  })

  it('links to SustainableWebsites.com as a call to action', () => {
    render(<AboutPage />)
    const cta = screen.getByRole('link', { name: /visit sustainablewebsites\.com/i })
    expect(cta.getAttribute('href')).toBe('https://sustainablewebsites.com')
  })
})
