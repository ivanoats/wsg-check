import type { SustainabilityReport } from '../report/index.js'

interface StoredCheckResult {
  readonly id: string
  readonly status: 'completed'
  readonly report: SustainabilityReport
  readonly createdAt: number
}

const STORE_TTL_MS = 1000 * 60 * 60
const MAX_STORED_RESULTS = 500
const checkStore = new Map<string, StoredCheckResult>()

const evictExpired = (now: number): void => {
  checkStore.forEach((entry, key) => {
    if (now - entry.createdAt > STORE_TTL_MS) {
      checkStore.delete(key)
    }
  })
}

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
