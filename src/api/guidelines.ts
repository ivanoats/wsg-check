import {
  fetchWsgGuidelines,
  mapApiToGuidelineEntries,
  TESTABILITY_OVERLAY,
  GUIDELINES_REGISTRY,
  getGuidelineById,
} from '../config/index.js'
import type { GuidelineEntry } from '../config/index.js'

interface GuidelineSourceResult {
  readonly source: 'w3c-api' | 'static-fallback'
  readonly guidelines: ReadonlyArray<GuidelineEntry>
}

export const loadGuidelines = async (): Promise<GuidelineSourceResult> => {
  const apiResult = await fetchWsgGuidelines()
  if (apiResult.ok) {
    return {
      source: 'w3c-api',
      guidelines: mapApiToGuidelineEntries(apiResult.value, TESTABILITY_OVERLAY),
    }
  }

  return {
    source: 'static-fallback',
    guidelines: GUIDELINES_REGISTRY,
  }
}

export const findGuidelineById = async (
  id: string
): Promise<{
  readonly source: 'w3c-api' | 'static-fallback'
  readonly guideline?: GuidelineEntry
}> => {
  const loaded = await loadGuidelines()
  const fromLoaded = loaded.guidelines.find((guideline) => guideline.id === id)
  if (fromLoaded !== undefined) {
    return { source: loaded.source, guideline: fromLoaded }
  }

  const staticEntry = getGuidelineById(id)
  if (staticEntry === undefined) {
    return { source: 'static-fallback' }
  }

  return {
    source: 'static-fallback',
    guideline: staticEntry,
  }
}
