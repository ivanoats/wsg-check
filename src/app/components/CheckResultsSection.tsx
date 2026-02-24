'use client'

import { Collapsible } from '@ark-ui/react'
import { styled } from 'styled-system/jsx'
import { css } from 'styled-system/css'
import { collapsible, badge, button } from 'styled-system/recipes'
import type { CheckResult } from '@/core/types'

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

const sectionHeadingClass = css({
  fontSize: 'lg',
  fontWeight: 'semibold',
  color: 'fg.default',
  mb: '3',
})

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

const collapsibleStyles = collapsible()

// ─── Sub-components ──────────────────────────────────────────────────────────

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
      <styled.div flex="1">
        <styled.p fontSize="sm" fontWeight="medium" color="fg.default">
          {check.guidelineName}{' '}
          <styled.span color="fg.subtle" fontSize="xs">
            ({check.guidelineId})
          </styled.span>
        </styled.p>
        <styled.p fontSize="sm" color="fg.default" lineHeight="relaxed" mt="0.5">
          {check.message}
        </styled.p>
        {check.details && (
          <styled.p fontSize="xs" color="fg.subtle" mt="0.5" fontStyle="italic">
            {check.details}
          </styled.p>
        )}
      </styled.div>
    </styled.div>
  </styled.li>
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
    <Collapsible.Root
      className={collapsibleStyles.root}
      style={{
        marginBottom: '0.75rem',
        border: '1px solid var(--colors-border-default)',
        borderRadius: '0.5rem',
        overflow: 'hidden',
      }}
    >
      <Collapsible.Trigger
        className={button({ variant: 'ghost', size: 'md' })}
        style={{ width: '100%', justifyContent: 'space-between', borderRadius: 0 }}
        aria-label={`Toggle ${category} check results`}
      >
        <styled.span textTransform="uppercase" fontWeight="semibold">
          {category}
        </styled.span>
        <styled.span display="flex" gap="2" alignItems="center" fontSize="xs" color="fg.subtle">
          <styled.span color="green.9">✓ {passCount}</styled.span>
          {failCount > 0 && <styled.span color="red.9">✗ {failCount}</styled.span>}
          {warnCount > 0 && <styled.span color="amber.9">⚠ {warnCount}</styled.span>}
          <Collapsible.Indicator
            style={{ display: 'inline-block', transition: 'transform 0.2s' }}
            className={css({ '[data-state=open] &': { transform: 'rotate(180deg)' } })}
          >
            <span aria-hidden="true">▼</span>
          </Collapsible.Indicator>
        </styled.span>
      </Collapsible.Trigger>

      <Collapsible.Content className={collapsibleStyles.content}>
        <styled.ul
          listStyleType="none"
          m="0"
          p="0"
          role="list"
          aria-label={`${category} check results`}
        >
          {items.map((check) => (
            <CheckRow key={check.guidelineId} check={check} />
          ))}
        </styled.ul>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Expandable/collapsible check results grouped by WSG category.
 * Uses Ark UI Collapsible + Park UI collapsible recipe for accessible
 * expand/collapse with CSS animation (WSG 2.6).
 */
export const CheckResultsSection = ({ checks }: CheckResultsSectionProps) => {
  const groups = groupByCategory(checks)
  if (groups.length === 0) return null

  return (
    <styled.section aria-labelledby="check-results-heading" mt="6">
      <h2 id="check-results-heading" className={sectionHeadingClass}>
        Check Results
      </h2>
      {groups.map(({ category, items }) => (
        <CategoryGroup key={category} category={category} items={items} />
      ))}
    </styled.section>
  )
}
