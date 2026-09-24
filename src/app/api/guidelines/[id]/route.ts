import { NextRequest } from 'next/server'
import { optionsResponse } from '@/api/cors'
import { errorJson, okJson } from '@/api/response'
import { enforceRateLimit } from '@/api/rate-limit'
import { findGuidelineById } from '@/api/guidelines'
import type { GuidelineDetailResponseBody } from '@/api/types'

export const runtime = 'nodejs'

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>
}

export const OPTIONS = (): Response => optionsResponse()

export const GET = async (request: NextRequest, context: RouteContext): Promise<Response> => {
  const rateLimited = await enforceRateLimit(request)
  if (rateLimited !== null) return rateLimited

  const params = await context.params
  const result = findGuidelineById(params.id)

  if (result.guideline === undefined) {
    return errorJson(404, 'NOT_FOUND', `Guideline "${params.id}" was not found.`)
  }

  const response: GuidelineDetailResponseBody = {
    guideline: result.guideline,
    spec: result.spec,
  }

  return okJson(response)
}
