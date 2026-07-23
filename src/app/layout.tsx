import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Family Shelf',
  description: 'A shared family catalog for tracking borrowed items',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
