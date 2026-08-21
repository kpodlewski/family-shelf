import type { Metadata } from 'next'
import { ProfileGate } from '@/components/ProfileGate'
import './globals.css'

export const metadata: Metadata = {
  title: 'Family Shelf',
  description: 'A shared family catalog for tracking borrowed items',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ProfileGate>{children}</ProfileGate>
      </body>
    </html>
  )
}
