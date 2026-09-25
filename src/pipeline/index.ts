/**
 * Application-level operations shared by the CLI, the API, and the MCP
 * server: choosing checks and producing a report for a URL.
 */

export { ALL_CHECKS, DEFAULT_CATEGORIES, selectChecks } from './selection'
export type { CheckSelection, SelectionNotice } from './selection'
export { runReport } from './run-report'
export type { RunReportOptions } from './run-report'
