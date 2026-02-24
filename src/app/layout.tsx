import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { styled } from 'styled-system/jsx'
import { Header } from './components/Header'
import { BottomNav } from './components/BottomNav'

/**
 * Inter is self-hosted by Next.js at build time — no runtime external request.
 * WOFF2 format is used automatically; font-display:swap is the default.
 * System-font fallbacks ensure text is visible before the font loads.
 * WSG 2.13: Use a system font stack as fallback to reduce render-blocking.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'WSG Check',
  description: 'Checks a website against the W3C Web Sustainability Guidelines',
}

/** Explicit viewport export — prevents user-scalable=no and sets a safe default. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Do NOT set maximumScale or userScalable — WCAG 1.4.4 requires users can zoom
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* Skip link — keyboard / screen-reader users can jump past navigation (WSG 3.9) */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Banner landmark */}
        <Header />

        {/* Main content landmark — pb="16" (4 rem) clears the fixed bottom nav.
            tabIndex={-1} allows the skip link to reliably move focus here. */}
        <styled.main id="main-content" tabIndex={-1} pb="16">
          {children}
        </styled.main>

        {/* <footer> is implicitly role="contentinfo" when a direct child of <body> */}
        <footer>
          <BottomNav />
        </footer>

        {/* Progressive enhancement: inform users when JavaScript is disabled.
            The URL check form requires JS; all static pages remain readable.
            bottom="20" (5rem) clears the fixed bottom nav (4rem / h-16) with space to spare. */}
        <noscript>
          <styled.p
            position="fixed"
            bottom="20"
            left="0"
            right="0"
            textAlign="center"
            bg="bg.subtle"
            borderTopWidth="1px"
            borderColor="border.default"
            py="2"
            px="4"
            fontSize="sm"
            color="fg.muted"
            zIndex="overlay"
          >
            JavaScript is required to run sustainability checks. All other pages are fully
            functional.
          </styled.p>
        </noscript>
      </body>
    </html>
  )
}
