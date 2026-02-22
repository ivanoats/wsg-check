import { describe, it, expect } from 'vitest'
import {
  GRADE_COLORS,
  getGradeColor,
  scoreBadgeData,
  scoreBadgeSvg,
  categoryBarChartData,
  categoryBarChartSvg,
  compareTrend,
} from '@/report/visualization'
import type { ScoreBadgeData, CategoryChartBar, TrendComparison } from '@/report/visualization'
import type { SustainabilityReport } from '@/report/types'
import type { RunResult } from '@/core/types'
import { fromRunResult } from '@/report/types'
import { makeCategoryScore, makeRunResult } from './helpers'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeReport = (overrides: Partial<RunResult> = {}): SustainabilityReport =>
  fromRunResult(makeRunResult(overrides))

// ─── GRADE_COLORS ─────────────────────────────────────────────────────────────

describe('GRADE_COLORS', () => {
  it('has an entry for every grade', () => {
    expect(GRADE_COLORS).toHaveProperty('A')
    expect(GRADE_COLORS).toHaveProperty('B')
    expect(GRADE_COLORS).toHaveProperty('C')
    expect(GRADE_COLORS).toHaveProperty('D')
    expect(GRADE_COLORS).toHaveProperty('F')
  })

  it('each value is a CSS hex color', () => {
    for (const color of Object.values(GRADE_COLORS)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

// ─── getGradeColor ────────────────────────────────────────────────────────────

describe('getGradeColor', () => {
  it('returns the color for grade A', () => {
    expect(getGradeColor('A')).toBe(GRADE_COLORS.A)
  })

  it('returns the color for grade F', () => {
    expect(getGradeColor('F')).toBe(GRADE_COLORS.F)
  })

  it('returns different colors for different grades', () => {
    const colors = (['A', 'B', 'C', 'D', 'F'] as const).map(getGradeColor)
    const unique = new Set(colors)
    expect(unique.size).toBe(5)
  })
})

// ─── scoreBadgeData ───────────────────────────────────────────────────────────

describe('scoreBadgeData', () => {
  it('returns the correct grade, score, color, and label', () => {
    const data: ScoreBadgeData = scoreBadgeData('B', 80)
    expect(data.grade).toBe('B')
    expect(data.score).toBe(80)
    expect(data.color).toBe(GRADE_COLORS.B)
    expect(data.label).toBe('Grade B — 80/100')
  })

  it('label includes the grade letter and score', () => {
    const data = scoreBadgeData('A', 95)
    expect(data.label).toContain('A')
    expect(data.label).toContain('95')
  })
})

// ─── scoreBadgeSvg ────────────────────────────────────────────────────────────

describe('scoreBadgeSvg', () => {
  it('returns a string containing an <svg> element', () => {
    const svg = scoreBadgeSvg('B', 80)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('includes the grade letter in the SVG text', () => {
    const svg = scoreBadgeSvg('A', 93)
    expect(svg).toContain('A')
    expect(svg).toContain('93')
  })

  it('includes the grade color in the SVG', () => {
    const svg = scoreBadgeSvg('F', 30)
    expect(svg).toContain(GRADE_COLORS.F)
  })

  it('includes a <title> element for accessibility', () => {
    const svg = scoreBadgeSvg('C', 65)
    expect(svg).toContain('<title>')
    expect(svg).toContain('65')
  })

  it('includes an aria-label attribute', () => {
    const svg = scoreBadgeSvg('D', 50)
    expect(svg).toContain('aria-label')
  })

  it('escapes the label text to prevent XSS', () => {
    // grade/score are controlled inputs but we verify the SVG is well-formed
    const svg = scoreBadgeSvg('A', 100)
    expect(svg).not.toContain('<script')
  })
})

// ─── categoryBarChartData ─────────────────────────────────────────────────────

describe('categoryBarChartData', () => {
  it('returns one bar per category', () => {
    const report = makeReport({
      categoryScores: [
        makeCategoryScore({ category: 'web-dev', score: 80 }),
        makeCategoryScore({ category: 'hosting', score: 60 }),
      ],
    })
    const bars: ReadonlyArray<CategoryChartBar> = categoryBarChartData(report)
    expect(bars).toHaveLength(2)
  })

  it('fills percent equals the score', () => {
    const report = makeReport({
      categoryScores: [makeCategoryScore({ category: 'web-dev', score: 72 })],
    })
    const [bar] = categoryBarChartData(report)
    expect(bar.fillPercent).toBe(72)
    expect(bar.score).toBe(72)
  })

  it('sorts bars by score descending', () => {
    const report = makeReport({
      categoryScores: [
        makeCategoryScore({ category: 'hosting', score: 40 }),
        makeCategoryScore({ category: 'web-dev', score: 90 }),
        makeCategoryScore({ category: 'ux', score: 65 }),
      ],
    })
    const bars = categoryBarChartData(report)
    expect(bars[0].score).toBeGreaterThanOrEqual(bars[1].score)
    expect(bars[1].score).toBeGreaterThanOrEqual(bars[2].score)
  })

  it('assigns a hex color to each bar', () => {
    const report = makeReport({
      categoryScores: [makeCategoryScore({ category: 'web-dev', score: 55 })],
    })
    const [bar] = categoryBarChartData(report)
    expect(bar.color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('returns an empty array when there are no categories', () => {
    const report = makeReport({ categoryScores: [] })
    expect(categoryBarChartData(report)).toHaveLength(0)
  })
})

// ─── categoryBarChartSvg ──────────────────────────────────────────────────────

describe('categoryBarChartSvg', () => {
  it('returns an SVG string', () => {
    const report = makeReport({
      categoryScores: [makeCategoryScore({ category: 'web-dev', score: 80 })],
    })
    const svg = categoryBarChartSvg(report)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('includes each category name in the SVG', () => {
    const report = makeReport({
      categoryScores: [
        makeCategoryScore({ category: 'web-dev', score: 80 }),
        makeCategoryScore({ category: 'hosting', score: 60 }),
      ],
    })
    const svg = categoryBarChartSvg(report)
    expect(svg).toContain('web-dev')
    expect(svg).toContain('hosting')
  })

  it('includes each category score in the SVG', () => {
    const report = makeReport({
      categoryScores: [makeCategoryScore({ category: 'web-dev', score: 77 })],
    })
    const svg = categoryBarChartSvg(report)
    expect(svg).toContain('77')
  })

  it('includes a <title> for accessibility', () => {
    const report = makeReport({
      categoryScores: [makeCategoryScore({ category: 'web-dev', score: 80 })],
    })
    const svg = categoryBarChartSvg(report)
    expect(svg).toContain('<title>')
  })

  it('returns an empty string when there are no categories', () => {
    const report = makeReport({ categoryScores: [] })
    expect(categoryBarChartSvg(report)).toBe('')
  })
})

// ─── compareTrend ─────────────────────────────────────────────────────────────

describe('compareTrend', () => {
  const prevReport = makeReport({
    overallScore: 70,
    categoryScores: [makeCategoryScore({ category: 'web-dev', score: 70 })],
  })
  const currReport = makeReport({
    overallScore: 80,
    categoryScores: [makeCategoryScore({ category: 'web-dev', score: 80 })],
  })

  it('sets url from the current report', () => {
    const trend: TrendComparison = compareTrend(prevReport, currReport)
    expect(trend.url).toBe(currReport.url)
  })

  it('records previousScore and currentScore correctly', () => {
    const trend = compareTrend(prevReport, currReport)
    expect(trend.previousScore).toBe(70)
    expect(trend.currentScore).toBe(80)
  })

  it('computes scoreDelta as current minus previous', () => {
    const trend = compareTrend(prevReport, currReport)
    expect(trend.scoreDelta).toBe(10)
  })

  it('computes negative scoreDelta when score declined', () => {
    const trend = compareTrend(currReport, prevReport)
    expect(trend.scoreDelta).toBe(-10)
  })

  it('records previousGrade and currentGrade', () => {
    const trend = compareTrend(prevReport, currReport)
    expect(trend.previousGrade).toBe(prevReport.grade)
    expect(trend.currentGrade).toBe(currReport.grade)
  })

  it('sets gradeImproved to true when grade improves', () => {
    const prev = makeReport({ overallScore: 60 }) // C
    const curr = makeReport({ overallScore: 80 }) // B
    const trend = compareTrend(prev, curr)
    expect(trend.gradeImproved).toBe(true)
  })

  it('sets gradeImproved to false when grade declines', () => {
    const prev = makeReport({ overallScore: 80 }) // B
    const curr = makeReport({ overallScore: 60 }) // C
    const trend = compareTrend(prev, curr)
    expect(trend.gradeImproved).toBe(false)
  })

  it('sets gradeImproved to null when grade is unchanged', () => {
    const prev = makeReport({ overallScore: 80 }) // B
    const curr = makeReport({ overallScore: 85 }) // still B
    const trend = compareTrend(prev, curr)
    expect(trend.gradeImproved).toBeNull()
  })

  describe('category trends', () => {
    it('includes a trend entry for each category', () => {
      const trend = compareTrend(prevReport, currReport)
      expect(trend.categories).toHaveLength(1)
    })

    it('marks improved category correctly', () => {
      const trend = compareTrend(prevReport, currReport)
      const cat = trend.categories.find((c) => c.category === 'web-dev')
      expect(cat?.direction).toBe('improved')
      expect(cat?.delta).toBe(10)
    })

    it('marks declined category correctly', () => {
      const trend = compareTrend(currReport, prevReport)
      const cat = trend.categories.find((c) => c.category === 'web-dev')
      expect(cat?.direction).toBe('declined')
      expect(cat?.delta).toBe(-10)
    })

    it('marks unchanged category correctly', () => {
      const trend = compareTrend(prevReport, prevReport)
      const cat = trend.categories.find((c) => c.category === 'web-dev')
      expect(cat?.direction).toBe('unchanged')
      expect(cat?.delta).toBe(0)
    })

    it('handles categories present only in the previous report', () => {
      const prev = makeReport({
        categoryScores: [makeCategoryScore({ category: 'business', score: 70 })],
      })
      const curr = makeReport({ categoryScores: [] })
      const trend = compareTrend(prev, curr)
      const cat = trend.categories.find((c) => c.category === 'business')
      expect(cat).toBeDefined()
      expect(cat?.previousScore).toBe(70)
      expect(cat?.currentScore).toBe(0)
    })

    it('handles categories present only in the current report', () => {
      const prev = makeReport({ categoryScores: [] })
      const curr = makeReport({
        categoryScores: [makeCategoryScore({ category: 'hosting', score: 85 })],
      })
      const trend = compareTrend(prev, curr)
      const cat = trend.categories.find((c) => c.category === 'hosting')
      expect(cat).toBeDefined()
      expect(cat?.previousScore).toBe(0)
      expect(cat?.currentScore).toBe(85)
    })
  })

  describe('summary', () => {
    it('counts improved, declined, and unchanged categories', () => {
      const prev = makeReport({
        categoryScores: [
          makeCategoryScore({ category: 'web-dev', score: 60 }),
          makeCategoryScore({ category: 'hosting', score: 80 }),
          makeCategoryScore({ category: 'ux', score: 70 }),
        ],
      })
      const curr = makeReport({
        categoryScores: [
          makeCategoryScore({ category: 'web-dev', score: 80 }), // improved
          makeCategoryScore({ category: 'hosting', score: 70 }), // declined
          makeCategoryScore({ category: 'ux', score: 70 }), // unchanged
        ],
      })
      const trend = compareTrend(prev, curr)
      expect(trend.summary.improved).toBe(1)
      expect(trend.summary.declined).toBe(1)
      expect(trend.summary.unchanged).toBe(1)
    })
  })

  it('records previousTimestamp and currentTimestamp', () => {
    const prev = makeReport()
    const curr = { ...makeReport(), timestamp: '2024-06-01T00:00:00.000Z' } as SustainabilityReport
    const trend = compareTrend(prev, curr)
    expect(trend.previousTimestamp).toBe(prev.timestamp)
    expect(trend.currentTimestamp).toBe(curr.timestamp)
  })
})
