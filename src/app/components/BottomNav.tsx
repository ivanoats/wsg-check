import { styled } from 'styled-system/jsx'
import { css } from 'styled-system/css'
import Link from 'next/link'

/** Navigation item definition */
type NavItem = {
  readonly href: string
  readonly label: string
  /** Inline SVG path data for the icon */
  readonly iconPath: string
  readonly ariaLabel: string
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  {
    href: '/',
    label: 'Check',
    iconPath: 'M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9ZM9 12l2 2 4-4',
    ariaLabel: 'Check — run a sustainability check',
  },
  {
    href: '/results',
    label: 'Results',
    iconPath: 'M9 17H5a2 2 0 0 0-2 2v0M13 17h6M5 12h14M5 7h8',
    ariaLabel: 'Results — view check results',
  },
  {
    href: '/guidelines',
    label: 'Guidelines',
    iconPath:
      'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z',
    ariaLabel: 'Guidelines — browse WSG guidelines',
  },
  {
    href: '/about',
    label: 'About',
    iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
    ariaLabel: 'About — project information',
  },
]

const navLinkClass = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'full',
  gap: '1',
  color: 'fg.muted',
  textDecoration: 'none',
  fontSize: 'xs',
  /* minimum 48 × 48 px touch target */
  minH: '12',
  minW: '12',
})

/**
 * Thumb-friendly bottom navigation bar for mobile-first layout (WSG 2.5).
 * Placed at the bottom of the viewport so primary actions are within easy reach.
 * Uses Park UI design tokens for automatic light/dark mode support.
 */
export const BottomNav = () => (
  <styled.nav
    aria-label="Main navigation"
    position="fixed"
    bottom="0"
    left="0"
    right="0"
    h="16"
    bg="bg.default"
    borderTopWidth="1px"
    borderColor="border.default"
    display="flex"
    alignItems="stretch"
    zIndex="sticky"
  >
    <styled.ul display="flex" w="full" listStyleType="none" m="0" p="0">
      {NAV_ITEMS.map((item) => (
        <styled.li key={item.href} flex="1">
          <Link href={item.href} aria-label={item.ariaLabel} className={navLinkClass}>
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
              <path d={item.iconPath} />
            </svg>
            <span>{item.label}</span>
          </Link>
        </styled.li>
      ))}
    </styled.ul>
  </styled.nav>
)
