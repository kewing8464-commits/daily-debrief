import type { Metadata, Viewport } from 'next'
import { Nunito, Source_Serif_4 } from 'next/font/google'
import type { CSSProperties } from 'react'
import { DESIGN } from '@/lib/design'
import './globals.css'

const serif = Source_Serif_4({ variable: '--font-serif-face', subsets: ['latin'] })
const rounded = Nunito({ variable: '--font-rounded-face', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Daily Debrief',
  description: 'Five minutes a night. Learn what makes your good days good.',
  appleWebApp: { capable: true, title: 'Debrief', statusBarStyle: 'black-translucent' },
  icons: { apple: '/icons/180' },
}

export const viewport: Viewport = {
  themeColor: DESIGN.colors.bg,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

const themeVars = {
  '--bg': DESIGN.colors.bg,
  '--surface': DESIGN.colors.surface,
  '--text': DESIGN.colors.text,
  '--muted': DESIGN.colors.muted,
  '--accent': DESIGN.colors.accent,
  '--accent2': DESIGN.colors.accent2,
  '--radius': `${DESIGN.radius}px`,
  '--scale': String(DESIGN.scale),
} as CSSProperties

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" style={themeVars} className={`${serif.variable} ${rounded.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
