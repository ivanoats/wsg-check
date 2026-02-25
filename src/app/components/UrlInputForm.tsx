'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Field } from '@ark-ui/react/field'
import { createStyleContext, styled } from 'styled-system/jsx'
import { field, button, input, alert } from 'styled-system/recipes'
import type { CheckResponseBody } from '@/api/types'

const RECENT_CHECKS_KEY = 'wsg-check:recent-urls'
const MAX_RECENT = 5

// ─── Park UI styled Field components ─────────────────────────────────────────
// Use createStyleContext so each sub-component receives its recipe slot class
// from the nearest FieldRoot context — no manual className props required.
const { withProvider, withContext } = createStyleContext(field)
const FieldRoot = withProvider(Field.Root, 'root')
const FieldLabel = withContext(Field.Label, 'label')
const FieldErrorText = withContext(Field.ErrorText, 'errorText')
// Input uses the standalone `input` recipe (not the `field__input` slot) for full border/padding styling.
const FieldInput = styled(Field.Input, input)

const alertStyles = alert()

/**
 * Validates that a string is a well-formed http/https URL.
 * Returns the normalised URL on success or an error message on failure.
 */
const parseUrl = (raw: string): { ok: true; url: URL } | { ok: false; message: string } => {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, message: 'Please enter a URL.' }
  let href = trimmed
  if (!/^https?:\/\//i.test(href)) href = `https://${href}`
  try {
    const url = new URL(href)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, message: 'Only http:// and https:// URLs are supported.' }
    }
    return { ok: true, url }
  } catch {
    return { ok: false, message: 'Please enter a valid URL (e.g. https://example.com).' }
  }
}

const readRecent = (): ReadonlyArray<string> => {
  try {
    const raw = localStorage.getItem(RECENT_CHECKS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as unknown[]).filter((v): v is string => typeof v === 'string')
  } catch {
    return []
  }
}

const saveRecent = (url: string): void => {
  try {
    const existing = readRecent().filter((u) => u !== url)
    localStorage.setItem(RECENT_CHECKS_KEY, JSON.stringify([url, ...existing].slice(0, MAX_RECENT)))
  } catch {
    // ignore localStorage errors (private browsing, storage quota)
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface UrlFieldInputProps {
  readonly value: string
  readonly error: string
  readonly isLoading: boolean
  readonly onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

/** Field.Root + label + input + error text — extracted to limit JSX depth. */
const UrlFieldInput = ({ value, error, isLoading, onChange }: UrlFieldInputProps) => (
  <FieldRoot invalid={Boolean(error)} flex="1">
    <FieldLabel srOnly>Website URL</FieldLabel>
    <FieldInput
      type="url"
      autoComplete="url"
      placeholder="https://example.com"
      value={value}
      onChange={onChange}
      disabled={isLoading}
      size="lg"
    />
    <FieldErrorText>{error}</FieldErrorText>
  </FieldRoot>
)

interface RecentCheckButtonProps {
  readonly url: string
  readonly onSelect: (url: string) => Promise<void>
}

/** Single recent-check button — extracted to avoid arrow functions and void in JSX. */
const RecentCheckButton = ({ url, onSelect }: RecentCheckButtonProps) => {
  const handleClick = useCallback(async () => {
    await onSelect(url)
  }, [url, onSelect])

  return (
    <button
      type="button"
      className={button({ variant: 'ghost', size: 'sm' })}
      onClick={handleClick}
    >
      {url}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * URL input form for the Home / Check page (WSG 2.15).
 *
 * Features:
 * - URL validation (http/https only, auto-prefixes scheme)
 * - Submits POST /api/check and redirects to /results/:id
 * - Persists recent checks in localStorage for quick re-check
 * - 48px+ touch targets, accessible error messages via Ark UI Field
 */
export const UrlInputForm = () => {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [recent, setRecent] = useState<ReadonlyArray<string>>([])

  // Read localStorage only on the client to avoid hydration mismatch
  useEffect(() => {
    setRecent(readRecent())
  }, [])

  const handleSubmit = useCallback(
    async (urlString: string) => {
      const parsed = parseUrl(urlString)
      if (!parsed.ok) {
        setError(parsed.message)
        return
      }
      setError('')
      setApiError('')
      setIsLoading(true)
      try {
        const res = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: parsed.url.toString() }),
        })
        if (!res.ok) {
          const body = (await res.json()) as { message?: string }
          setApiError(body.message ?? 'Check failed. Please try again.')
          return
        }
        const data = (await res.json()) as Partial<CheckResponseBody>
        if (!data.id) {
          setApiError('Unexpected response from server.')
          return
        }
        // Cache the full response in sessionStorage so the results page can read
        // it client-side, avoiding serverless in-memory store sharing issues.
        try {
          sessionStorage.setItem(`wsg-check:result:${data.id}`, JSON.stringify(data))
        } catch {
          // ignore sessionStorage errors (private browsing, storage quota)
        }
        saveRecent(parsed.url.toString())
        setRecent(readRecent())
        router.push(`/results/${data.id}`)
      } catch {
        setApiError('Network error. Please check your connection and try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [router]
  )

  const onFormSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      await handleSubmit(value)
    },
    [value, handleSubmit]
  )

  const onUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value)
      if (error) setError('')
      if (apiError) setApiError('')
    },
    [error, apiError]
  )

  const handleRecentSelect = useCallback(
    async (recentUrl: string) => {
      setValue(recentUrl)
      await handleSubmit(recentUrl)
    },
    [handleSubmit]
  )

  return (
    <styled.div display="flex" flexDirection="column" gap="4">
      <form onSubmit={onFormSubmit} noValidate aria-label="Sustainability check form">
        <styled.div display="flex" gap="2" alignItems="flex-start">
          <UrlFieldInput value={value} error={error} isLoading={isLoading} onChange={onUrlChange} />
          <button
            type="submit"
            disabled={isLoading}
            className={button({ variant: 'solid', size: 'xl' })}
            aria-busy={isLoading}
          >
            {isLoading ? 'Checking…' : 'Check'}
          </button>
        </styled.div>
      </form>

      {apiError && (
        <div className={alertStyles.root} role="alert">
          <div className={alertStyles.content}>
            <p className={alertStyles.description}>{apiError}</p>
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <styled.div display="flex" flexDirection="column" gap="2">
          <styled.p fontSize="sm" color="fg.default" fontWeight="semibold">
            Recent checks
          </styled.p>
          <styled.ul listStyleType="none" m="0" p="0" display="flex" flexDirection="column" gap="1">
            {recent.map((url) => (
              <li key={url}>
                <RecentCheckButton url={url} onSelect={handleRecentSelect} />
              </li>
            ))}
          </styled.ul>
        </styled.div>
      )}
    </styled.div>
  )
}
