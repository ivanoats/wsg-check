import type { Metadata } from 'next'
import './globals.css'
import { styled } from 'styled-system/jsx'
import { Header } from './components/Header'
import { BottomNav } from './components/BottomNav'

export const metadata: Metadata = {
  title: 'WSG Check',
  description: 'Checks a website against the W3C Web Sustainability Guidelines',
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

        {/* Main content landmark — pb="16" (4 rem) clears the fixed bottom nav.
            tabIndex={-1} allows the skip link to reliably move focus here. */}
        <styled.main id="main-content" tabIndex={-1} pb="16">
          {children}
        </styled.main>

        {/* <footer> is implicitly role="contentinfo" when a direct child of <body> */}
        <footer>
          <BottomNav />
        </footer>
      </body>
    </html>
  )
}
