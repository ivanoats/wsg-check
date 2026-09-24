import { NextRequest } from 'next/server'
import { optionsResponse } from '@/api/cors'
import { enforceRateLimit } from '@/api/rate-limit'
import { okJson } from '@/api/response'
import type { HealthResponseBody } from '@/api/types'
import { WSG_SPEC } from '@/config/spec/index'
import { VERSION } from '@/version'

export const runtime = 'nodejs'

export const OPTIONS = (): Response => optionsResponse()

export const GET = async (request: NextRequest): Promise<Response> => {
  const rateLimited = await enforceRateLimit(request)
  if (rateLimited !== null) return rateLimited

  const response: HealthResponseBody = {
    status: 'ok',
    service: 'wsg-check-api',
    timestamp: new Date().toISOString(),
    version: VERSION,
    specVersion: WSG_SPEC.release,
  }

  return okJson(response)
}
