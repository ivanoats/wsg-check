import type { SustainabilityReport } from '../report/index'
import type { GuidelineEntry, WSGCategory } from '../config/index'

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

export interface ApiErrorBody {
  readonly error: ApiErrorCode
  readonly message: string
  readonly details?: Readonly<Record<string, unknown>>
}

export interface CheckRequestBody {
  readonly url: string
  readonly categories?: ReadonlyArray<WSGCategory>
  readonly guidelines?: ReadonlyArray<string>
  readonly format?: 'json' | 'html' | 'markdown'
}

export interface CheckResponseBody {
  readonly id: string
  readonly status: 'completed'
  readonly report: SustainabilityReport
}

export interface CheckResultLookupBody {
  readonly id: string
  readonly status: 'completed'
  readonly report: SustainabilityReport
}

export interface GuidelineListResponseBody {
  readonly guidelines: ReadonlyArray<GuidelineEntry>
  readonly source: 'w3c-api' | 'static-fallback'
}

export interface GuidelineDetailResponseBody {
  readonly guideline: GuidelineEntry
  readonly source: 'w3c-api' | 'static-fallback'
}

export interface HealthResponseBody {
  readonly status: 'ok'
  readonly service: 'wsg-check-api'
  readonly timestamp: string
}
