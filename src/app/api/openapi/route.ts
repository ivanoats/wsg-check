import { NextRequest } from 'next/server'
import { optionsResponse } from '@/api/cors'
import { enforceRateLimit } from '@/api/rate-limit'
import { okJson } from '@/api/response'
import { OPENAPI_SPEC } from '@/api/openapi'

export const runtime = 'nodejs'

export const OPTIONS = async (): Promise<Response> => optionsResponse()

export const GET = async (request: NextRequest): Promise<Response> => {
  const rateLimited = await enforceRateLimit(request)
  if (rateLimited !== null) return rateLimited
  return okJson(OPENAPI_SPEC)
}
