import { NextRequest } from 'next/server'
import { optionsResponse } from '@/api/cors'
import { enforceRateLimit } from '@/api/rate-limit'
import { okJson } from '@/api/response'
import type { HealthResponseBody } from '@/api/types'

export const runtime = 'nodejs'

export const OPTIONS = async (): Promise<Response> => optionsResponse()

export const GET = async (request: NextRequest): Promise<Response> => {
  const rateLimited = await enforceRateLimit(request)
  if (rateLimited !== null) return rateLimited

  const response: HealthResponseBody = {
    status: 'ok',
    service: 'wsg-check-api',
    timestamp: new Date().toISOString(),
  }

  return okJson(response)
}
