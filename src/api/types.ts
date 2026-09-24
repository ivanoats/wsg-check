import type { SustainabilityReport } from '../report/index'
import type { GuidelineEntry, WSGCategory, WsgSpecInfo } from '../config/index'

export type ApiErrorCode =
  'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INTERNAL_ERROR'

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
  /** The WSG release the guidelines come from. */
  readonly spec: WsgSpecInfo
}

export interface GuidelineDetailResponseBody {
  readonly guideline: GuidelineEntry
  /** The WSG release the guideline comes from. */
  readonly spec: WsgSpecInfo
}

export interface HealthResponseBody {
  readonly status: 'ok'
  readonly service: 'wsg-check-api'
  readonly timestamp: string
}
