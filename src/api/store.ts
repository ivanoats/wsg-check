/**
 * In-memory store for completed sustainability check results.
 *
 * Results expire after {@link STORE_TTL_MS} (1 hour) and the store is capped
 * at {@link MAX_STORED_RESULTS} entries to limit memory usage.  Both limits
 * are enforced lazily on every write and read, so no background timer is
 * needed (WSG 3.20 — avoid unnecessary background processes).
 */
import type { SustainabilityReport } from '../report/index'

interface StoredCheckResult {
  readonly id: string
  readonly status: 'completed'
  readonly report: SustainabilityReport
  readonly createdAt: number
}

/** Time-to-live for stored results: 1 hour. */
const STORE_TTL_MS = 1000 * 60 * 60
/** Maximum number of results held in memory at any time. */
const MAX_STORED_RESULTS = 500
const checkStore = new Map<string, StoredCheckResult>()

/** Remove entries older than {@link STORE_TTL_MS}. */
const evictExpired = (now: number): void => {
  checkStore.forEach((entry, key) => {
    if (now - entry.createdAt > STORE_TTL_MS) {
      checkStore.delete(key)
    }
  })
}

/**
 * Remove the oldest entry when the store exceeds {@link MAX_STORED_RESULTS}.
 * Map iteration order is insertion order, so the first key is the oldest.
 */
const evictOverflow = (): void => {
  if (checkStore.size <= MAX_STORED_RESULTS) return
  const oldestKey = checkStore.keys().next().value as string | undefined
  if (oldestKey !== undefined) {
    checkStore.delete(oldestKey)
  }
}

export const saveCheckResult = (id: string, report: SustainabilityReport): void => {
  const now = Date.now()
  evictExpired(now)
  checkStore.set(id, { id, status: 'completed', report, createdAt: now })
  evictOverflow()
}

export const findCheckResult = (
  id: string
):
  | { readonly id: string; readonly status: 'completed'; readonly report: SustainabilityReport }
  | undefined => {
  const now = Date.now()
  evictExpired(now)
  const entry = checkStore.get(id)
  if (entry === undefined) return undefined
  return {
    id: entry.id,
    status: entry.status,
    report: entry.report,
  }
}
