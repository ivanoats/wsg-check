/**
 * Minimal next/font/google manual mock for unit tests.
 * The real module performs build-time font downloading; this stub returns
 * the same shape so that components importing it can be rendered in jsdom.
 */

type FontResult = {
  readonly className: string
  readonly style: { readonly fontFamily: string }
  readonly variable: string
}

/** Stub that mirrors the `Inter(options)` call signature. */
export const Inter = (): FontResult => ({
  className: 'mock-inter',
  style: { fontFamily: 'Inter, sans-serif' },
  variable: '--font-inter',
})
