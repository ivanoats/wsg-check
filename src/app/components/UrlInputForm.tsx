'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Field } from '@ark-ui/react/field'
import { styled } from 'styled-system/jsx'
import { css } from 'styled-system/css'
import { field } from 'styled-system/recipes'
import { button } from 'styled-system/recipes'

const RECENT_CHECKS_KEY = 'wsg-check:recent-urls'
const MAX_RECENT = 5

const styles = field()

const recentButtonClass = css({
  color: 'accent.default',
  textDecoration: 'none',
  fontSize: 'sm',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: '0',
  _hover: { textDecoration: 'underline' },
})

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
      setIsLoading(true)
      try {
        const res = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: parsed.url.toString() }),
        })
        if (!res.ok) {
          const body = (await res.json()) as { message?: string }
          setError(body.message ?? 'Check failed. Please try again.')
          return
        }
        const data = (await res.json()) as { id?: string }
        if (!data.id) {
          setError('Unexpected response from server.')
          return
        }
        saveRecent(parsed.url.toString())
        setRecent(readRecent())
        router.push(`/results/${data.id}`)
      } catch {
        setError('Network error. Please check your connection and try again.')
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

  return (
    <styled.div display="flex" flexDirection="column" gap="4">
      <form onSubmit={onFormSubmit} noValidate aria-label="Sustainability check form">
        <styled.div display="flex" gap="2" alignItems="flex-start">
          <Field.Root invalid={!!error} className={css({ flex: '1' })}>
            <Field.Label className={css({ srOnly: true })}>Website URL</Field.Label>
            <Field.Input
              type="url"
              autoComplete="url"
              placeholder="https://example.com"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                if (error) setError('')
              }}
              disabled={isLoading}
              className={styles.input}
            />
            <Field.ErrorText className={styles.errorText}>{error}</Field.ErrorText>
          </Field.Root>
          <button
            type="submit"
            disabled={isLoading}
            className={button({ variant: 'solid', size: 'lg' })}
            aria-busy={isLoading}
          >
            {isLoading ? 'Checking…' : 'Check'}
          </button>
        </styled.div>
      </form>

      {recent.length > 0 && (
        <styled.div display="flex" flexDirection="column" gap="2">
          <styled.p fontSize="sm" color="fg.muted" fontWeight="medium">
            Recent checks
          </styled.p>
          <styled.ul listStyleType="none" m="0" p="0" display="flex" flexDirection="column" gap="1">
            {recent.map((url) => (
              <li key={url}>
                <button
                  type="button"
                  className={recentButtonClass}
                  onClick={() => {
                    setValue(url)
                    void handleSubmit(url)
                  }}
                >
                  {url}
                </button>
              </li>
            ))}
          </styled.ul>
        </styled.div>
      )}
    </styled.div>
  )
}
