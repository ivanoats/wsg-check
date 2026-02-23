import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { WsgChecker } from '@/core/index'
import { fromRunResult } from '@/report/index'
import { optionsResponse } from '@/api/cors'
import { errorJson, okJson } from '@/api/response'
import { enforceRateLimit } from '@/api/rate-limit'
import { saveCheckResult } from '@/api/store'
import { selectChecks } from '@/api/check-selection'
import { validateCheckPayload, validateTargetUrl } from '@/api/validation'
import type { CheckResponseBody } from '@/api/types'

export const runtime = 'nodejs'

export const OPTIONS = async (): Promise<Response> => optionsResponse()

export const POST = async (request: NextRequest): Promise<Response> => {
  const rateLimited = await enforceRateLimit(request)
  if (rateLimited !== null) return rateLimited

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorJson(400, 'BAD_REQUEST', 'Request body must be valid JSON.')
  }

  const validatedPayload = validateCheckPayload(payload)
  if (!validatedPayload.ok) {
    return errorJson(400, 'BAD_REQUEST', validatedPayload.error.message)
  }

  const validatedUrl = await validateTargetUrl(validatedPayload.value.url)
  if (!validatedUrl.ok) {
    return errorJson(400, 'BAD_REQUEST', validatedUrl.error.message)
  }

  try {
    const checks = selectChecks(
      validatedPayload.value.categories,
      validatedPayload.value.guidelines
    )
    const checker = new WsgChecker({}, checks)
    const runResult = await checker.check(validatedUrl.value.toString())

    if (!runResult.ok) {
      return errorJson(400, 'BAD_REQUEST', runResult.error.message)
    }

    const report = fromRunResult(runResult.value, 0, 0, 0)
    const id = randomUUID()
    saveCheckResult(id, report)

    const response: CheckResponseBody = {
      id,
      status: 'completed',
      report,
    }

    return okJson(response)
  } catch (error) {
    return errorJson(500, 'INTERNAL_ERROR', 'Unexpected error while running the check.', {
      cause: error instanceof Error ? error.message : 'unknown',
    })
  }
}
