import type { CheckFnWithId } from '../core/types.js'
import {
  performanceChecks,
  semanticChecks,
  sustainabilityChecks,
  securityChecks,
  uxDesignChecks,
  hostingChecks,
} from '../checks/index.js'
import type { WSGCategory } from '../config/index.js'

const DEFAULT_CATEGORIES: ReadonlyArray<WSGCategory> = ['ux', 'web-dev', 'hosting', 'business']

export const selectChecks = (
  categories: ReadonlyArray<WSGCategory> = DEFAULT_CATEGORIES,
  guidelines: ReadonlyArray<string> = []
): ReadonlyArray<CheckFnWithId> => {
  const selectedCategories = new Set<WSGCategory>(categories)

  const categoryChecks: ReadonlyArray<CheckFnWithId> = [
    ...(selectedCategories.has('web-dev')
      ? [...performanceChecks, ...semanticChecks, ...sustainabilityChecks, ...securityChecks]
      : []),
    ...(selectedCategories.has('ux') ? [...uxDesignChecks] : []),
    ...(selectedCategories.has('hosting') ? [...hostingChecks] : []),
  ]

  if (guidelines.length === 0) {
    return categoryChecks
  }

  const guidelineSet = new Set(guidelines)
  return categoryChecks.filter((check) => guidelineSet.has(check.guidelineId))
}
