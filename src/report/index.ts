/**
 * Report Module
 *
 * Provides the data model and factory function for converting a `RunResult`
 * into a fully enriched `SustainabilityReport`, along with types for
 * grades, recommendations, metadata, and methodology.
 *
 * Phase 6.1: Report Data Model ✅
 * Phase 6.2: Report Formatters (JSON / Markdown / HTML / Terminal) ✅
 * Phase 6.3: Recommendations Engine ✅
 * Phase 6.4: Score Visualisation ✅
 *
 * Usage:
 * ```ts
 * import { fromRunResult, scoreToGrade } from '@/report'
 * import type { SustainabilityReport, Grade, Recommendation } from '@/report'
 *
 * const report = fromRunResult(runResult, htmlSize, resourceCount, thirdPartyCount)
 * console.log(report.grade, report.summary, report.recommendations)
 * ```
 */

export { scoreToGrade, fromRunResult, STATIC_ANALYSIS_DISCLAIMER } from './types'

export type {
  Grade,
  Recommendation,
  ReportMetadata,
  ReportMethodology,
  ReportSummary,
  SustainabilityReport,
} from './types'

export { COMPLEMENTARY_TOOLS, CWV_GUIDELINE_IDS, buildRecommendations } from './recommendations'
export type { ComplementaryTool } from './recommendations'

export { formatJson, formatMarkdown, formatHtml, formatTerminal } from './formatters/index'
export type { TerminalFormatOptions } from './formatters/index'

export {
  GRADE_COLORS,
  getGradeColor,
  scoreBadgeData,
  scoreBadgeSvg,
  categoryBarChartData,
  categoryBarChartSvg,
  compareTrend,
} from './visualization'
export type {
  ScoreBadgeData,
  CategoryChartBar,
  CategoryTrend,
  TrendComparison,
} from './visualization'
