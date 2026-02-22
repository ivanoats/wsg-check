/**
 * Client for the W3C Web Sustainability Guidelines (WSG) JSON API.
 *
 * The API is published and maintained by the W3C Sustainable Web Interest
 * Group at:
 *   https://w3c.github.io/sustainableweb-wsg/guidelines.json
 *
 * It is kept in sync with the WSG specification and is the authoritative
 * source for guideline titles, descriptions, success criteria, resource
 * links, and spec URLs.
 *
 * ## Testability overlay
 *
 * The W3C API does not carry machine-testability assessments — those are
 * wsg-check's own judgements about which guidelines can be checked
 * automatically.  A local {@link TESTABILITY_OVERLAY} map stores these
 * assessments and is applied when transforming API data into
 * {@link GuidelineEntry} objects.  Any guideline not listed in the overlay
 * defaults to `'manual-only'`.
 *
 * ## Usage
 *
 * ```ts
 * import { fetchWsgGuidelines, mapApiToGuidelineEntries } from '@/config/wsg-api-client'
 * import { TESTABILITY_OVERLAY } from '@/config/wsg-api-client'
 *
 * const result = await fetchWsgGuidelines()
 * if (result.ok) {
 *   const entries = mapApiToGuidelineEntries(result.value, TESTABILITY_OVERLAY)
 * }
 * ```
 *
 * @see https://github.com/w3c/sustainableweb-wsg
 */

import axios from 'axios'
import type { WsgApiCategory, WsgApiResponse } from './wsg-api-types.js'
import type { GuidelineEntry, Testability, WSGCategory } from './types.js'

// ─── Constants ────────────────────────────────────────────────────────────────

/** URL of the W3C WSG guidelines JSON API (GitHub Pages, updated on spec changes). */
export const WSG_GUIDELINES_API_URL =
  'https://w3c.github.io/sustainableweb-wsg/guidelines.json' as const

/**
 * Mapping from WSG API category IDs to WSGCategory enum values used
 * throughout wsg-check.
 *
 * Category 1 ("Introduction") is intentionally omitted — it contains no
 * guidelines.
 */
const CATEGORY_ID_TO_ENUM: Readonly<Record<string, WSGCategory>> = {
  '2': 'ux',
  '3': 'web-dev',
  '4': 'hosting',
  '5': 'business',
}

// ─── Error type ───────────────────────────────────────────────────────────────

/** Thrown when the W3C WSG API cannot be fetched or parsed. */
export class WsgApiError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = 'WsgApiError'
  }
}

// ─── Result type ─────────────────────────────────────────────────────────────

/** A successful result. */
export type Ok<T> = { readonly ok: true; readonly value: T }
/** A failed result. */
export type Err<E> = { readonly ok: false; readonly error: E }
/** Discriminated union representing success or failure. */
export type Result<T, E> = Ok<T> | Err<E>

const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
const err = <E>(error: E): Err<E> => ({ ok: false, error })

// ─── Testability overlay ──────────────────────────────────────────────────────

/**
 * wsg-check's own assessment of which WSG guidelines are machine-testable.
 *
 * Keys are absolute guideline IDs (e.g. `"3.3"`); values are testability
 * levels.  Guidelines absent from this map default to `'manual-only'`.
 *
 * This overlay is applied by {@link mapApiToGuidelineEntries} when building
 * a {@link GuidelineEntry} array from the W3C API response.
 */
export const TESTABILITY_OVERLAY: ReadonlyMap<string, Testability> = new Map([
  // ── Section 2: UX Design ──────────────────────────────────────────────────
  ['2.3', 'semi-automated'],
  ['2.6', 'semi-automated'],
  ['2.7', 'semi-automated'],
  ['2.8', 'semi-automated'],
  ['2.11', 'semi-automated'],
  ['2.15', 'semi-automated'],
  ['2.16', 'automated'],
  ['2.17', 'semi-automated'],
  ['2.18', 'automated'],
  ['2.19', 'semi-automated'],
  ['2.20', 'automated'],

  // ── Section 3: Web Development ────────────────────────────────────────────
  ['3.2', 'automated'],
  ['3.3', 'automated'],
  ['3.4', 'automated'],
  ['3.5', 'semi-automated'],
  ['3.6', 'semi-automated'],
  ['3.7', 'semi-automated'],
  ['3.8', 'automated'],
  ['3.9', 'automated'],
  ['3.10', 'automated'],
  ['3.11', 'semi-automated'],
  ['3.12', 'semi-automated'],
  ['3.13', 'automated'],
  ['3.14', 'semi-automated'],
  ['3.15', 'automated'],
  ['3.16', 'semi-automated'],
  ['3.17', 'automated'],
  ['3.18', 'automated'],
  ['3.19', 'semi-automated'],
  ['3.20', 'automated'],
  ['3.21', 'automated'],
  ['3.22', 'semi-automated'],
  ['3.23', 'semi-automated'],
  ['3.24', 'semi-automated'],
  ['3.25', 'automated'],
  ['3.26', 'automated'],

  // ── Section 4: Hosting & Infrastructure ───────────────────────────────────
  ['4.1', 'semi-automated'],
  ['4.2', 'automated'],
  ['4.3', 'semi-automated'],
  ['4.4', 'automated'],
  ['4.6', 'semi-automated'],
  ['4.7', 'automated'],
  ['4.8', 'automated'],
  ['4.12', 'automated'],

  // ── Section 5: Business Strategy ──────────────────────────────────────────
  ['5.6', 'semi-automated'],
  ['5.9', 'semi-automated'],
])

// ─── Fetch function ───────────────────────────────────────────────────────────

/**
 * Fetches the W3C WSG guidelines JSON API and returns the parsed response.
 *
 * Uses Axios (already a project dependency) with a 10-second timeout.
 * Returns a {@link Result} so callers can handle errors without try/catch.
 *
 * @example
 * ```ts
 * const result = await fetchWsgGuidelines()
 * if (!result.ok) {
 *   console.error('Could not fetch guidelines', result.error.message)
 *   return
 * }
 * const entries = mapApiToGuidelineEntries(result.value, TESTABILITY_OVERLAY)
 * ```
 */
export const fetchWsgGuidelines = async (): Promise<Result<WsgApiResponse, WsgApiError>> => {
  try {
    const response = await axios.get<WsgApiResponse>(WSG_GUIDELINES_API_URL, {
      timeout: 10_000,
      headers: { Accept: 'application/json' },
    })
    return ok(response.data)
  } catch (cause) {
    return err(
      new WsgApiError(`Failed to fetch WSG guidelines from ${WSG_GUIDELINES_API_URL}`, cause)
    )
  }
}

// ─── Mapping function ─────────────────────────────────────────────────────────

/**
 * Maps a {@link WsgApiResponse} to an array of {@link GuidelineEntry} objects
 * compatible with the wsg-check guidelines registry.
 *
 * The mapping logic:
 * - Converts relative guideline IDs (`"1"` within category `"2"`) to
 *   absolute IDs (`"2.1"`).
 * - Derives `category` from the API category ID using
 *   {@link CATEGORY_ID_TO_ENUM}.
 * - Sets `testability` from the provided overlay (defaults to
 *   `'manual-only'` if the guideline is not listed).
 * - Sets `specUrl` to the canonical W3C spec URL from the API.
 * - Uses `subheading` as `description` (concise, one-sentence summary).
 *
 * Introduction (category id `"1"`) is silently skipped as it contains no
 * guidelines.
 *
 * @param apiResponse  Parsed response from {@link fetchWsgGuidelines}.
 * @param overlay      Map of guideline ID → testability level.
 */
export const mapApiToGuidelineEntries = (
  apiResponse: WsgApiResponse,
  overlay: ReadonlyMap<string, Testability>
): ReadonlyArray<GuidelineEntry> =>
  apiResponse.category.flatMap((category: WsgApiCategory) => {
    const wsGCategory = CATEGORY_ID_TO_ENUM[category.id]
    if (wsGCategory === undefined || !category.guidelines) return []

    return category.guidelines.map((guideline) => {
      const id = `${category.id}.${guideline.id}`
      return {
        id,
        title: guideline.guideline,
        section: category.name,
        category: wsGCategory,
        testability: overlay.get(id) ?? 'manual-only',
        description: guideline.subheading,
        specUrl: guideline.url,
      } satisfies GuidelineEntry
    })
  })
