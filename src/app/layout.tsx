import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
