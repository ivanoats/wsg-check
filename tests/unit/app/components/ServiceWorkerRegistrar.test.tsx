import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { ServiceWorkerRegistrar } from '@/app/components/ServiceWorkerRegistrar'

describe('ServiceWorkerRegistrar', () => {
  const registerMock = vi.fn()

  beforeEach(() => {
    registerMock.mockResolvedValue({} as ServiceWorkerRegistration)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    registerMock.mockReset()
  })

  it('calls navigator.serviceWorker.register with /sw.js when supported', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock },
      writable: true,
      configurable: true,
    })

    render(<ServiceWorkerRegistrar />)

    await vi.waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith('/sw.js')
    })
  })

  it('does not throw when serviceWorker is not in navigator', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow()
  })

  it('renders no DOM elements (behaviour-only component)', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock },
      writable: true,
      configurable: true,
    })

    const { container } = render(<ServiceWorkerRegistrar />)
    expect(container.firstChild).toBeNull()
  })

  it('swallows registration errors silently', async () => {
    registerMock.mockRejectedValue(new Error('SW registration failed'))
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock },
      writable: true,
      configurable: true,
    })

    // Render should not throw; the rejected promise is caught inside the component
    render(<ServiceWorkerRegistrar />)

    await vi.waitFor(() => {
      expect(registerMock).toHaveBeenCalled()
    })
    // If we reach here without an unhandled rejection propagating, the error was swallowed
  })
})
