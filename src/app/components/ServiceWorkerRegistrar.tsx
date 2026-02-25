'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker for offline access to previous results.
 *
 * WSG 4.2 — Optimise Browser Caching: a service worker caches the app shell
 * and previously fetched check results so users can view them without a network
 * connection and repeat-visit data transfer is minimised.
 *
 * Renders nothing — this is a behaviour-only component.
 * Registration failures are silently swallowed; the app works fully online.
 */
export const ServiceWorkerRegistrar = () => {
  useEffect(() => {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Non-critical — the app works fully without a service worker.
      })
    }
  }, [])

  return null
}
