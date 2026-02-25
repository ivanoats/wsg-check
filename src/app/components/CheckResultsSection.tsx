'use client'

import { Accordion } from '@ark-ui/react'
import { styled } from 'styled-system/jsx'
import { cx, css } from 'styled-system/css'
import { accordion, badge } from 'styled-system/recipes'
import type { CheckResult } from '@/core/types'
import { SectionHeading } from './SectionHeading'

interface CheckResultsSectionProps {
  readonly checks: ReadonlyArray<CheckResult>
}

const statusColor: Readonly<Record<string, { bg: string; fg: string }>> = {
  pass: { bg: 'green.9', fg: 'white' },
  fail: { bg: 'red.9', fg: 'white' },
  warn: { bg: 'amber.9', fg: 'white' },
  info: { bg: 'blue.9', fg: 'white' },
  'not-applicable': { bg: 'gray.7', fg: 'white' },
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
  borderColor: 'border.default',
  _last: { borderBottomWidth: '0' },
})

/** Groups checks by their WSG category. */
const groupByCategory = (
  checks: ReadonlyArray<CheckResult>
): ReadonlyArray<{ category: string; items: ReadonlyArray<CheckResult> }> => {
  const map = checks.reduce<Map<string, CheckResult[]>>((acc, check) => {
    const existing = acc.get(check.category)
    if (existing) {
      existing.push(check)
    } else {
      acc.set(check.category, [check])
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
    <styled.p fontSize="sm" fontWeight="medium" color="fg.default">
      {check.guidelineName}{' '}
      <styled.span color="fg.muted" fontSize="xs">
        ({check.guidelineId})
      </styled.span>
    </styled.p>
    <styled.p fontSize="sm" color="fg.default" lineHeight="relaxed" mt="0.5">
      {check.message}
    </styled.p>
    {check.details && (
      <styled.p fontSize="xs" color="fg.muted" mt="0.5" fontStyle="italic">
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
        className={badge({ variant: 'solid', size: 'sm' })}
        bg={statusColor[check.status]?.bg ?? 'gray.7'}
        color={statusColor[check.status]?.fg ?? 'white'}
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
  <styled.span display="flex" gap="2" alignItems="center" fontSize="xs" color="fg.muted">
    <styled.span color="green.9">✓ {passCount}</styled.span>
    {failCount > 0 && <styled.span color="red.9">✗ {failCount}</styled.span>}
    {warnCount > 0 && <styled.span color="amber.9">⚠ {warnCount}</styled.span>}
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
