import { NextRequest } from 'next/server'
import { optionsResponse } from '@/api/cors'
import { findCheckResult } from '@/api/store'
import { errorJson, okJson } from '@/api/response'
import { enforceRateLimit } from '@/api/rate-limit'
import type { CheckResultLookupBody } from '@/api/types'

export const runtime = 'nodejs'

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>
}

export const OPTIONS = async (): Promise<Response> => optionsResponse()

export const GET = async (request: NextRequest, context: RouteContext): Promise<Response> => {
  const rateLimited = await enforceRateLimit(request)
  if (rateLimited !== null) return rateLimited

  const params = await context.params
  const result = findCheckResult(params.id)
  if (result === undefined) {
    return errorJson(404, 'NOT_FOUND', `No completed check found for id "${params.id}".`)
  }

  const response: CheckResultLookupBody = {
    id: result.id,
    status: result.status,
    report: result.report,
  }

  return okJson(response)
}
