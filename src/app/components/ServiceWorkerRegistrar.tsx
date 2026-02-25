'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker for offline access to previous results.
 *
 * WSG 4.2 — Optimise Browser Caching: a service worker caches the app shell
 * and previously fetched check results so users can view them without a network
 * connection and repeat-visit data transfer is minimised.
 *
 * Registration is gated to production builds (`NODE_ENV === 'production'`) to
 * avoid stale-asset caching issues during local development and testing.
 *
 * Renders nothing — this is a behaviour-only component.
 * Registration failures are silently swallowed; the app works fully online.
 */
export const ServiceWorkerRegistrar = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non-critical — the app works fully without a service worker.
      })
    }
  }, [])

  return null
}
