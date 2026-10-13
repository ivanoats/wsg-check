import type { Metadata, Viewport } from 'next'
import './globals.css'
import { styled } from 'styled-system/jsx'
import { Header } from './components/Header'
import { BottomNav } from './components/BottomNav'
import { ServiceWorkerRegistrar } from './components/ServiceWorkerRegistrar'

export const metadata: Metadata = {
  title: 'WSG Check',
  description: 'Checks a website against the W3C Web Sustainability Guidelines',
  // Link the Web App Manifest so browsers can offer PWA installation and
  // the WSG 4.2 offline-access check detects the <link rel="manifest"> tag.
  manifest: '/site.webmanifest',
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
    <html lang="en">
      <body>
        {/* Skip link — keyboard / screen-reader users can jump past navigation (WSG 3.9) */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Banner landmark */}
        <Header />

        {/* Main content landmark — pb="16" (4 rem) clears the fixed bottom nav; px="4" (1 rem)
            provides consistent horizontal whitespace on all pages.
            tabIndex={-1} allows the skip link to reliably move focus here. */}
        <styled.main id="main-content" tabIndex={-1} pb="16" px="4">
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
            bg="surface.100"
            borderTopWidth="1px"
            borderColor="border"
            py="2"
            px="4"
            fontSize="sm"
            color="ink.muted"
            zIndex="overlay"
          >
            JavaScript is required to run sustainability checks. All other pages are fully
            functional.
          </styled.p>
        </noscript>

        {/* Service worker registration — enables offline access to cached results (WSG 4.2) */}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
