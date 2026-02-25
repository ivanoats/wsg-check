import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ResultsClient } from '@/app/results/[id]/ResultsClient'
import type { SustainabilityReport } from '@/report/types'

vi.mock('next/link')
vi.mock('next/navigation')

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      Reflect.deleteProperty(store, key)
    },
    clear: () => {
      store = {}
    },
  }
})()
vi.stubGlobal('sessionStorage', sessionStorageMock)

const MOCK_REPORT: SustainabilityReport = {
  url: 'https://example.com',
  timestamp: '2024-01-01T00:00:00.000Z',
  duration: 1000,
  overallScore: 80,
  grade: 'B',
  categories: [],
  checks: [],
  summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0, notApplicable: 0 },
  recommendations: [],
  metadata: { pageWeight: 0, requestCount: 0, thirdPartyCount: 0 },
  methodology: { analysisType: 'static', disclaimer: 'Test disclaimer' },
}

describe('ResultsClient', () => {
  beforeEach(() => {
    sessionStorageMock.clear()
    fetchMock.mockReset()
  })

  it('renders report immediately from sessionStorage without calling fetch', async () => {
    sessionStorageMock.setItem(
      'wsg-check:result:abc123',
      JSON.stringify({ id: 'abc123', status: 'completed', report: MOCK_REPORT })
    )

    render(<ResultsClient id="abc123" />)

    // Score should be visible without any async wait (no loading flicker)
    expect(screen.getByText(/score: 80\/100/i)).toBeDefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches from API when sessionStorage is empty and renders the report', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'abc123', status: 'completed', report: MOCK_REPORT }),
    })

    render(<ResultsClient id="abc123" />)

    await waitFor(() => {
      expect(screen.getByText(/score: 80\/100/i)).toBeDefined()
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/check/abc123', { cache: 'no-store' })
  })

  it('shows expired message when sessionStorage is empty and API returns not found', async () => {
    fetchMock.mockResolvedValue({ ok: false })

    render(<ResultsClient id="missing123" />)

    await waitFor(() => {
      expect(screen.getByText(/result not found/i)).toBeDefined()
    })
  })

  it('shows the checked URL in the report header', async () => {
    sessionStorageMock.setItem(
      'wsg-check:result:def456',
      JSON.stringify({ id: 'def456', status: 'completed', report: MOCK_REPORT })
    )

    render(<ResultsClient id="def456" />)

    expect(screen.getByText('https://example.com')).toBeDefined()
  })
})
