import { NextResponse } from 'next/server'

const ALLOW_ORIGIN = process.env.WSG_API_CORS_ORIGIN ?? '*'
const ALLOW_HEADERS = 'Content-Type, Authorization, X-Requested-With'
const ALLOW_METHODS = 'GET, POST, OPTIONS'

export const withCors = <T>(response: NextResponse<T>): NextResponse<T> => {
  response.headers.set('Access-Control-Allow-Origin', ALLOW_ORIGIN)
  response.headers.set('Access-Control-Allow-Methods', ALLOW_METHODS)
  response.headers.set('Access-Control-Allow-Headers', ALLOW_HEADERS)
  if (ALLOW_ORIGIN !== '*') {
    response.headers.set('Vary', 'Origin')
  }
  return response
}

export const optionsResponse = (): NextResponse => withCors(new NextResponse(null, { status: 204 }))
