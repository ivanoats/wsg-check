import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const notFoundMock = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})

vi.mock('next/navigation', () => ({ notFound: notFoundMock }))
vi.mock('@/app/results/[id]/ResultsClient', () => ({
  ResultsClient: ({ id }: { readonly id: string }) => <div data-testid="results-client">{id}</div>,
}))

const { default: ResultsIdPage } = await import('@/app/results/[id]/page')

describe('results/[id]/page', () => {
  beforeEach(() => {
    notFoundMock.mockClear()
  })

  it('renders ResultsClient for a valid UUIDv4 id', async () => {
    const validId = '123e4567-e89b-42d3-a456-426614174000'

    const element = await ResultsIdPage({ params: Promise.resolve({ id: validId }) })
    render(element)

    expect(screen.getByTestId('results-client').textContent).toBe(validId)
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('calls notFound for an invalid id', async () => {
    await expect(
      ResultsIdPage({ params: Promise.resolve({ id: '/\\/evil.com' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(notFoundMock).toHaveBeenCalledTimes(1)
  })
})
