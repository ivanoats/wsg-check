import Link from 'next/link'

/**
 * Minimal, distraction-free site header (WSG 2.6).
 * Rendered as a landmark <header> so screen readers can navigate directly to it.
 */
export const Header = () => (
  <header
    role="banner"
    style={{
      backgroundColor: 'var(--color-nav-bg)',
      borderBottom: '1px solid var(--color-nav-border)',
      padding: '0 1rem',
      height: '3.5rem',
      display: 'flex',
      alignItems: 'center',
    }}
  >
    <Link
      href="/"
      aria-label="WSG Check — home"
      style={{
        color: 'var(--color-text)',
        textDecoration: 'none',
        fontWeight: 700,
        fontSize: '1.125rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      {/* inline SVG leaf icon — no external image request */}
      <svg
        aria-hidden="true"
        focusable="false"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 20A7 7 0 0 1 4 13V6h7a7 7 0 0 1 7 7v7" />
        <path d="M7.5 13.5c1-1 3.5-3 5.5-2" />
      </svg>
      WSG Check
    </Link>
  </header>
)
