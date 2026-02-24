import { styled } from 'styled-system/jsx'
import { css } from 'styled-system/css'
import Link from 'next/link'

const homeLinkClass = css({
  color: 'fg.default',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: 'lg',
  display: 'flex',
  alignItems: 'center',
  gap: '2',
})

/**
 * Minimal, distraction-free site header (WSG 2.6).
 * Uses Park UI design tokens for automatic light/dark mode support.
 */
export const Header = () => (
  <styled.header
    bg="bg.default"
    borderBottomWidth="1px"
    borderColor="border.default"
    px="4"
    h="14"
    display="flex"
    alignItems="center"
  >
    <Link href="/" aria-label="WSG Check — home" className={homeLinkClass}>
      {/* inline SVG leaf icon — no external image request */}
      <svg
        aria-hidden="true"
        focusable="false"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 20A7 7 0 0 1 4 13V6h7a7 7 0 0 1 7 7v7" />
        <path d="M7.5 13.5c1-1 3.5-3 5.5-2" />
      </svg>
      WSG Check
    </Link>
  </styled.header>
)
