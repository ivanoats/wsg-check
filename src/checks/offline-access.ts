/**
 * WSG 4.2 – Optimise Browser Caching (Offline Access / PWA)
 *
 * Checks whether the page supports offline access through the two standard
 * browser mechanisms:
 *
 *   1. **Web App Manifest** — `<link rel="manifest">` in the document `<head>`
 *      enables PWA installation and offline metadata.
 *   2. **Service Worker** — a `navigator.serviceWorker.register(...)` call
 *      in the page's inline or referenced scripts indicates that assets are
 *      cached for offline use.
 *
 * Offline capability reduces repeat-visit data transfer (cached resources are
 * served locally) and allows the site to function without a network
 * connection, reducing unnecessary server requests.
 *
 * Scoring:
 *   - Both manifest and service worker present  → pass  (100)
 *   - One of the two present                    → warn   (50)
 *   - Neither present                           → fail    (0)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#optimise-browser-caching
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '4.2'
const GUIDELINE_NAME = 'Optimize Browser Caching'
const SUCCESS_CRITERION =
  'Pages should provide a web app manifest and register a service worker to support offline access'
const RESOURCES = ['https://www.w3.org/TR/web-sustainability-guidelines/#optimise-browser-caching']

/** Pattern to detect service worker registration calls in the HTML body. */
const SW_REGISTER_RE = /navigator\.serviceWorker\.register\s*\(/i

export const checkOfflineAccess: CheckFn = (page) => {
  const hasManifest = page.parsedPage.links.some((l) => l.rel?.toLowerCase() === 'manifest')

  const hasServiceWorker = SW_REGISTER_RE.test(page.fetchResult.body)

  if (hasManifest && hasServiceWorker) {
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: 'Web app manifest and service worker registration are both present.',
      impact: 'medium',
      category: 'hosting',
      machineTestable: true,
    }
  }

  if (hasManifest || hasServiceWorker) {
    const found = hasManifest ? 'web app manifest' : 'service worker registration'
    const missing = hasManifest
      ? 'service worker registration'
      : 'web app manifest (<link rel="manifest">)'

    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'warn',
      score: 50,
      message: `Partial offline support: ${found} found but ${missing} is missing.`,
      details: `Found: ${found}. Missing: ${missing}.`,
      recommendation:
        'For full offline support, provide both a <link rel="manifest"> pointing to a Web App Manifest ' +
        'and register a Service Worker via navigator.serviceWorker.register(). The Service Worker can ' +
        'cache critical resources using the Cache API so that pages load without a network connection.',
      resources: RESOURCES,
      impact: 'medium',
      category: 'hosting',
      machineTestable: true,
    }
  }

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'fail',
    score: 0,
    message: 'No web app manifest or service worker registration detected.',
    details:
      'Without a service worker, every page visit requires a full round-trip to the server, ' +
      'even for resources that rarely change.',
    recommendation:
      'Add a <link rel="manifest" href="/manifest.json"> to the document <head> and register ' +
      'a service worker that caches key assets. This enables offline access and dramatically ' +
      'reduces repeat-visit data transfer.',
    resources: RESOURCES,
    impact: 'medium',
    category: 'hosting',
    machineTestable: true,
  }
}
