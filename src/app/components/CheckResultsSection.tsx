'use client'

import { Accordion } from '@ark-ui/react'
import { styled } from 'styled-system/jsx'
import { cx, css } from 'styled-system/css'
import { accordion, badge } from 'styled-system/recipes'
import type { CheckResult } from '@/core/types'
import { guidelineLabel } from '@/report/formatters/labels'
import { SectionHeading } from './SectionHeading'

interface CheckResultsSectionProps {
  readonly checks: ReadonlyArray<CheckResult>
}

const statusClass: Readonly<Record<string, string>> = {
  pass: css({ bg: 'positive', color: 'surface.100' }),
  fail: css({ bg: 'critical', color: 'surface.100' }),
  warn: css({ bg: 'warning', color: 'surface.100' }),
  info: css({ bg: 'info', color: 'surface.100' }),
  'not-applicable': css({ bg: 'surface.100', color: 'ink.muted' }),
}

const statusLabel: Readonly<Record<string, string>> = {
  pass: 'Pass',
  fail: 'Fail',
  warn: 'Warn',
  info: 'Info',
  'not-applicable': 'N/A',
}

const checkRowClass = css({
  px: '4',
  py: '3',
  borderBottomWidth: '1px',
  borderColor: 'border',
  _last: { borderBottomWidth: '0' },
})

/** Group for related checks, which have no WSG guideline and are not scored. */
const RELATED_GROUP = 'related (not scored)'

/** Groups checks by their WSG category, with related checks in a group of their own. */
const groupByCategory = (
  checks: ReadonlyArray<CheckResult>
): ReadonlyArray<{ category: string; items: ReadonlyArray<CheckResult> }> => {
  const map = checks.reduce<Map<string, CheckResult[]>>((acc, check) => {
    const group = check.related === true ? RELATED_GROUP : check.category
    const existing = acc.get(group)
    if (existing) {
      existing.push(check)
    } else {
      acc.set(group, [check])
    }
    return acc
  }, new Map<string, CheckResult[]>())
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }))
}

const accordionStyles = accordion()

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Check details text — extracted for clarity. */
const CheckDetails = ({ check }: { readonly check: CheckResult }) => (
  <styled.div flex="1">
    <styled.p fontSize="sm" fontWeight="medium" color="ink">
      {check.guidelineName}{' '}
      <styled.span color="ink.muted" fontSize="xs">
        ({guidelineLabel(check)})
      </styled.span>
    </styled.p>
    <styled.p fontSize="sm" color="ink" lineHeight="relaxed" mt="0.5">
      {check.message}
    </styled.p>
    {check.details && (
      <styled.p fontSize="xs" color="ink.muted" mt="0.5" fontStyle="italic">
        {check.details}
      </styled.p>
    )}
  </styled.div>
)

/** Single check result row — extracted to limit JSX nesting depth. */
const CheckRow = ({ check }: { readonly check: CheckResult }) => (
  <styled.li role="listitem" className={checkRowClass}>
    <styled.div display="flex" gap="3" alignItems="flex-start">
      <styled.span
        className={cx(
          badge({ variant: 'solid', size: 'sm' }),
          statusClass[check.status] ?? css({ bg: 'surface.100', color: 'ink.muted' })
        )}
        flexShrink="0"
        aria-label={`Status: ${statusLabel[check.status] ?? check.status}`}
      >
        {statusLabel[check.status] ?? check.status}
      </styled.span>
      <CheckDetails check={check} />
    </styled.div>
  </styled.li>
)

/** Category summary counts — extracted for clarity. */
const CategorySummary = ({
  passCount,
  failCount,
  warnCount,
}: {
  readonly passCount: number
  readonly failCount: number
  readonly warnCount: number
}) => (
  <styled.span display="flex" gap="2" alignItems="center" fontSize="xs" color="ink.muted">
    <styled.span color="positive">✓ {passCount}</styled.span>
    {failCount > 0 && <styled.span color="critical">✗ {failCount}</styled.span>}
    {warnCount > 0 && <styled.span color="warning">⚠ {warnCount}</styled.span>}
    <Accordion.ItemIndicator
      className={cx(accordionStyles.itemIndicator, css({ display: 'inline-block' }))}
    >
      <span aria-hidden="true">▼</span>
    </Accordion.ItemIndicator>
  </styled.span>
)

const CategoryGroup = ({
  category,
  items,
}: {
  readonly category: string
  readonly items: ReadonlyArray<CheckResult>
}) => {
  const passCount = items.filter((c) => c.status === 'pass').length
  const failCount = items.filter((c) => c.status === 'fail').length
  const warnCount = items.filter((c) => c.status === 'warn').length

  return (
    <Accordion.Item value={category} className={accordionStyles.item}>
      <Accordion.ItemTrigger
        className={accordionStyles.itemTrigger}
        aria-label={`Toggle ${category} check results`}
      >
        <styled.span textTransform="uppercase" fontWeight="semibold">
          {category}
        </styled.span>
        <CategorySummary passCount={passCount} failCount={failCount} warnCount={warnCount} />
      </Accordion.ItemTrigger>
      <Accordion.ItemContent className={accordionStyles.itemContent}>
        <styled.ul
          listStyleType="none"
          m="0"
          p="0"
          role="list"
          aria-label={`${category} check results`}
        >
          {items.map((check) => (
            <CheckRow key={`${check.guidelineId}-${check.successCriterion}`} check={check} />
          ))}
        </styled.ul>
      </Accordion.ItemContent>
    </Accordion.Item>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Expandable/collapsible check results grouped by WSG category.
 * Uses Ark UI Accordion + Park UI accordion recipe for accessible
 * expand/collapse with CSS animation (WSG 2.6). multiple=true allows
 * all categories to be open simultaneously.
 */
export const CheckResultsSection = ({ checks }: CheckResultsSectionProps) => {
  const groups = groupByCategory(checks)
  if (groups.length === 0) return null

  return (
    <styled.section aria-labelledby="check-results-heading" mt="6">
      <SectionHeading id="check-results-heading">Check Results</SectionHeading>
      <Accordion.Root className={accordionStyles.root} multiple>
        {groups.map(({ category, items }) => (
          <CategoryGroup key={category} category={category} items={items} />
        ))}
      </Accordion.Root>
    </styled.section>
  )
}
