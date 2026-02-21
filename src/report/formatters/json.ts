/**
 * Report Formatter — JSON
 *
 * Serialises a `SustainabilityReport` to a JSON string.  The primary
 * use-case is machine-readable output for CI pipelines, API responses, and
 * data storage.
 */

import type { SustainabilityReport } from '../types.js'

/**
 * Serialises a `SustainabilityReport` to a JSON string.
 *
 * @param report - The report to serialise.
 * @param indent - Number of spaces for indentation (default `2`).  Pass `0`
 *   for compact/minified output.
 * @returns A JSON string representation of the report.
 */
export const formatJson = (report: SustainabilityReport, indent = 2): string =>
  JSON.stringify(report, null, indent)
