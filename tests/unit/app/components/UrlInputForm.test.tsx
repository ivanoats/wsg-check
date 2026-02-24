import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UrlInputForm } from '@/app/components/UrlInputForm'

vi.mock('next/link')
vi.mock('next/navigation')

// Stub fetch globally
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

// Stub localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()
vi.stubGlobal('localStorage', localStorageMock)

describe('UrlInputForm', () => {
  beforeEach(() => {
    localStorageMock.clear()
    fetchMock.mockReset()
  })

  it('renders the URL input and submit button', () => {
    render(<UrlInputForm />)
    expect(screen.getByRole('textbox', { name: /website url/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /check/i })).toBeDefined()
  })

  it('has the correct form accessible name', () => {
    render(<UrlInputForm />)
    expect(screen.getByRole('form', { name: /sustainability check form/i })).toBeDefined()
  })

  it('shows a validation error when submitted with empty input', async () => {
    render(<UrlInputForm />)
    fireEvent.submit(screen.getByRole('form', { name: /sustainability check form/i }))
    await waitFor(() => {
      expect(screen.getByText(/please enter a url/i)).toBeDefined()
    })
  })

  it('shows a validation error for invalid URL', async () => {
    render(<UrlInputForm />)
    fireEvent.change(screen.getByRole('textbox', { name: /website url/i }), {
      target: { value: 'not a url at all $$' },
    })
    fireEvent.submit(screen.getByRole('form', { name: /sustainability check form/i }))
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid url/i)).toBeDefined()
    })
  })

  it('clears the error when the user starts typing after an error', async () => {
    render(<UrlInputForm />)
    fireEvent.submit(screen.getByRole('form', { name: /sustainability check form/i }))
    await waitFor(() => expect(screen.getByText(/please enter a url/i)).toBeDefined())
    fireEvent.change(screen.getByRole('textbox', { name: /website url/i }), {
      target: { value: 'h' },
    })
    await waitFor(() => expect(screen.queryByText(/please enter a url/i)).toBeNull())
  })

  it('disables the submit button while loading', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {})) // never resolves
    render(<UrlInputForm />)
    fireEvent.change(screen.getByRole('textbox', { name: /website url/i }), {
      target: { value: 'https://example.com' },
    })
    fireEvent.submit(screen.getByRole('form', { name: /sustainability check form/i }))
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /checking/i }) as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })
  })

  it('shows a network error message when fetch throws', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'))
    render(<UrlInputForm />)
    fireEvent.change(screen.getByRole('textbox', { name: /website url/i }), {
      target: { value: 'https://example.com' },
    })
    fireEvent.submit(screen.getByRole('form', { name: /sustainability check form/i }))
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeDefined()
    })
  })

  it('shows an error when the server returns a non-OK response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'SSRF blocked' }),
    })
    render(<UrlInputForm />)
    fireEvent.change(screen.getByRole('textbox', { name: /website url/i }), {
      target: { value: 'https://example.com' },
    })
    fireEvent.submit(screen.getByRole('form', { name: /sustainability check form/i }))
    await waitFor(() => {
      expect(screen.getByText(/ssrf blocked/i)).toBeDefined()
    })
  })

  it('does not render the recent checks section when localStorage is empty', () => {
    render(<UrlInputForm />)
    expect(screen.queryByText(/recent checks/i)).toBeNull()
  })

  it('renders recent checks from localStorage after mount', async () => {
    localStorageMock.setItem(
      'wsg-check:recent-urls',
      JSON.stringify(['https://example.com', 'https://other.com'])
    )
    render(<UrlInputForm />)
    await waitFor(() => {
      expect(screen.getByText('https://example.com')).toBeDefined()
      expect(screen.getByText('https://other.com')).toBeDefined()
    })
  })
})
