/**
 * Carbon estimation utility for wsg-check.
 *
 * Wraps the `@tgwf/co2` library to compute CO2 emissions per page view using
 * the Sustainable Web Design v4 model, and to check whether a domain is served
 * by a green (renewable-energy) hosting provider via the Green Web Foundation
 * API.
 *
 * Design notes:
 * - `CO2_MODEL` is the canonical model identifier exposed in `RunResult`.
 * - `checkGreenHosting` is intentionally async and swallows network errors so
 *   that a failure to reach the Green Web Foundation API never breaks a run.
 * - `estimateCO2` is synchronous and pure once `isGreenHosted` is known.
 */

import { co2 as CO2Class, hosting } from '@tgwf/co2'

/** The CO2 model identifier exposed in `RunResult` metadata. */
export const CO2_MODEL = 'swd-v4' as const

/** Type alias for the model identifier string used in `RunResult`. */
export type CO2Model = typeof CO2_MODEL

// Instantiate the Sustainable Web Design v4 model once.
const co2Estimator = new CO2Class({ model: 'swd', version: 4 })

/**
 * Estimate grams of CO2 for transferring `bytes` of data.
 *
 * Uses the Sustainable Web Design v4 model.  Pass `isGreenHosted: true` when
 * the origin is known to be served from renewable energy — this reduces the
 * data-centre segment of the estimate.
 *
 * @param bytes         Total transfer size in bytes.
 * @param isGreenHosted Whether the hosting provider runs on renewable energy.
 * @returns             CO2 estimate in grams (rounded to 4 decimal places).
 */
export function estimateCO2(bytes: number, isGreenHosted: boolean): number {
  const result = co2Estimator.perByte(bytes, isGreenHosted)
  const raw = typeof result === 'number' ? result : (result as { total: number }).total
  return Math.round(raw * 1e4) / 1e4
}

/**
 * Query the Green Web Foundation API to determine whether `domain` is hosted
 * on renewable energy infrastructure.
 *
 * Falls back to `false` on any network or parsing error so that the overall
 * check run is never blocked by an external service outage.
 *
 * @param domain  The hostname to check (e.g. `"example.com"`).
 * @returns       `true` if the domain is recognised as green, `false` otherwise.
 */
export async function checkGreenHosting(domain: string): Promise<boolean> {
  try {
    const result = await (hosting.check(domain) as unknown as Promise<boolean>)
    return Boolean(result)
  } catch {
    return false
  }
}
