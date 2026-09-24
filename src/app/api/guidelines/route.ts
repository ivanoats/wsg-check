import { NextRequest } from 'next/server'
import { optionsResponse } from '@/api/cors'
import { okJson } from '@/api/response'
import { enforceRateLimit } from '@/api/rate-limit'
import { loadGuidelines } from '@/api/guidelines'
import type { GuidelineListResponseBody } from '@/api/types'

export const runtime = 'nodejs'

export const OPTIONS = (): Response => optionsResponse()

export const GET = async (request: NextRequest): Promise<Response> => {
  const rateLimited = await enforceRateLimit(request)
  if (rateLimited !== null) return rateLimited

  const loaded = loadGuidelines()
  const response: GuidelineListResponseBody = {
    guidelines: loaded.guidelines,
    spec: loaded.spec,
  }
  return okJson(response)
}
