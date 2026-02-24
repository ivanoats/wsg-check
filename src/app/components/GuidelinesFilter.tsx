'use client'

import { useState, useMemo, useCallback } from 'react'
import { Field } from '@ark-ui/react/field'
import { styled } from 'styled-system/jsx'
import { css } from 'styled-system/css'
import { field, link } from 'styled-system/recipes'
import type { GuidelineEntry, WSGCategory, Testability } from '@/config/types'

interface GuidelinesFilterProps {
  readonly guidelines: ReadonlyArray<GuidelineEntry>
}

const fieldStyles = field()

const testabilityColor: Readonly<Record<string, string>> = {
  automated: '#166534',
  'semi-automated': '#92400e',
  'manual-only': '#374151',
}

const categoryLabel: Readonly<Record<string, string>> = {
  ux: 'UX',
  'web-dev': 'Web Dev',
  hosting: 'Hosting',
  business: 'Business',
}

const testabilityLabel: Readonly<Record<string, string>> = {
  automated: 'Automated',
  'semi-automated': 'Semi-automated',
  'manual-only': 'Manual only',
}

/** Returns true when a guideline passes all active filters. */
const matchesFilters = (
  g: GuidelineEntry,
  search: string,
  category: WSGCategory | '',
  testability: Testability | ''
): boolean => {
  if (category && g.category !== category) return false
  if (testability && g.testability !== testability) return false
  if (search) {
    const lowerQuery = search.toLowerCase()
    return (
      g.id.includes(lowerQuery) ||
      g.title.toLowerCase().includes(lowerQuery) ||
      g.description.toLowerCase().includes(lowerQuery)
    )
  }
  return true
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Single guideline card — extracted to limit JSX nesting depth. */
const GuidelineCard = ({ g }: { readonly g: GuidelineEntry }) => (
  <styled.li p="4" borderWidth="1px" borderColor="border.default" borderRadius="lg" bg="bg.subtle">
    <styled.div
      display="flex"
      justifyContent="space-between"
      alignItems="flex-start"
      gap="2"
      mb="1"
    >
      <styled.div display="flex" gap="2" alignItems="center" flexWrap="wrap">
        <styled.span fontSize="xs" fontWeight="bold" color="fg.muted" fontFamily="mono">
          {g.id}
        </styled.span>
        <styled.span
          fontSize="xs"
          px="1.5"
          py="0.5"
          borderRadius="sm"
          color="white"
          fontWeight="medium"
          style={{ backgroundColor: testabilityColor[g.testability] ?? '#374151' }}
          aria-label={`Testability: ${testabilityLabel[g.testability]}`}
        >
          {testabilityLabel[g.testability]}
        </styled.span>
        <styled.span
          fontSize="xs"
          px="1.5"
          py="0.5"
          borderRadius="sm"
          borderWidth="1px"
          borderColor="border.default"
          color="fg.muted"
        >
          {categoryLabel[g.category] ?? g.category}
        </styled.span>
      </styled.div>
      {g.specUrl && (
        <a
          href={g.specUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={link()}
          style={{ flexShrink: 0, fontSize: '0.75rem' }}
          aria-label={`W3C spec for guideline ${g.id}`}
        >
          W3C ↗
        </a>
      )}
    </styled.div>
    <styled.h3 fontSize="sm" fontWeight="semibold" color="fg.default" mb="1">
      {g.title}
    </styled.h3>
    <styled.p fontSize="sm" color="fg.muted">
      {g.description}
    </styled.p>
  </styled.li>
)

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Client component providing search + filter controls for the guidelines list.
 * Filters by category, testability, and text search across id/title/description.
 */
export const GuidelinesFilter = ({ guidelines }: GuidelinesFilterProps) => {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<WSGCategory | ''>('')
  const [testability, setTestability] = useState<Testability | ''>('')

  const filtered = useMemo(
    () => guidelines.filter((g) => matchesFilters(g, search, category, testability)),
    [guidelines, search, category, testability]
  )

  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
    []
  )

  const onCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value as WSGCategory | ''),
    []
  )

  const onTestabilityChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => setTestability(e.target.value as Testability | ''),
    []
  )

  return (
    <styled.div display="flex" flexDirection="column" gap="4">
      {/* Filter controls */}
      <styled.div
        display="flex"
        flexWrap="wrap"
        gap="3"
        role="search"
        aria-label="Filter guidelines"
      >
        <Field.Root className={css({ flex: '1', minW: '40' })}>
          <Field.Label className={css({ srOnly: true })}>Search guidelines</Field.Label>
          <Field.Input
            type="search"
            placeholder="Search guidelines…"
            value={search}
            onChange={onSearchChange}
            className={fieldStyles.input}
            aria-label="Search guidelines"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label className={css({ srOnly: true })}>Filter by category</Field.Label>
          <Field.Select
            value={category}
            onChange={onCategoryChange}
            className={fieldStyles.select}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {(['ux', 'web-dev', 'hosting', 'business'] as WSGCategory[]).map((c) => (
              <option key={c} value={c}>
                {categoryLabel[c]}
              </option>
            ))}
          </Field.Select>
        </Field.Root>

        <Field.Root>
          <Field.Label className={css({ srOnly: true })}>Filter by testability</Field.Label>
          <Field.Select
            value={testability}
            onChange={onTestabilityChange}
            className={fieldStyles.select}
            aria-label="Filter by testability"
          >
            <option value="">All testability</option>
            {(['automated', 'semi-automated', 'manual-only'] as Testability[]).map((t) => (
              <option key={t} value={t}>
                {testabilityLabel[t]}
              </option>
            ))}
          </Field.Select>
        </Field.Root>
      </styled.div>

      {/* Results count */}
      <styled.p fontSize="sm" color="fg.muted" aria-live="polite" aria-atomic="true">
        Showing {filtered.length} of {guidelines.length} guidelines
      </styled.p>

      {/* Guidelines list */}
      {filtered.length === 0 ? (
        <styled.p color="fg.muted" fontSize="sm">
          No guidelines match your filters.
        </styled.p>
      ) : (
        <styled.ul listStyleType="none" m="0" p="0" display="flex" flexDirection="column" gap="3">
          {filtered.map((g) => (
            <GuidelineCard key={g.id} g={g} />
          ))}
        </styled.ul>
      )}
    </styled.div>
  )
}
