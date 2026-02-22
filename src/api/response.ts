import { NextResponse } from 'next/server'
import { withCors } from './cors.js'
import type { ApiErrorBody, ApiErrorCode } from './types.js'

export const okJson = <T>(body: T, status = 200): NextResponse<T> =>
  withCors(NextResponse.json(body, { status }))

export const errorJson = (
  status: number,
  error: ApiErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>
): NextResponse<ApiErrorBody> => {
  const body: ApiErrorBody =
    details === undefined
      ? { error, message }
      : {
          error,
          message,
          details,
        }

  return okJson(body, status)
}
