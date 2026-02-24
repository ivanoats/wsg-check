import type { Metadata } from 'next'
import './globals.css'
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

        {/* Main content landmark — padding-bottom clears the fixed bottom nav */}
        <main
          id="main-content"
          tabIndex={-1}
          style={{ paddingBottom: 'var(--bottom-nav-height)' }}
        >
          {children}
        </main>

        {/* Contentinfo landmark wraps the bottom navigation */}
        <footer role="contentinfo">
          <BottomNav />
        </footer>
      </body>
    </html>
  )
}
