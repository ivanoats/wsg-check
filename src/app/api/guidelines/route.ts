import { NextRequest } from 'next/server'
import { optionsResponse } from '@/api/cors'
import { errorJson, okJson } from '@/api/response'
import { enforceRateLimit } from '@/api/rate-limit'
import { loadGuidelines } from '@/api/guidelines'
import type { GuidelineListResponseBody } from '@/api/types'

export const runtime = 'nodejs'

export const OPTIONS = async (): Promise<Response> => optionsResponse()

export const GET = async (request: NextRequest): Promise<Response> => {
  const rateLimited = await enforceRateLimit(request)
  if (rateLimited !== null) return rateLimited

  try {
    const loaded = await loadGuidelines()
    const response: GuidelineListResponseBody = {
      guidelines: loaded.guidelines,
      source: loaded.source,
    }
    return okJson(response)
  } catch (error) {
    return errorJson(500, 'INTERNAL_ERROR', 'Failed to load guidelines.', {
      cause: error instanceof Error ? error.message : 'unknown',
    })
  }
}
