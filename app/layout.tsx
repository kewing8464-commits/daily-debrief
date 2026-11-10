import type { Metadata, Viewport } from 'next'
import { Hanken_Grotesk, Literata } from 'next/font/google'
import { cookies } from 'next/headers'
import type { CSSProperties } from 'react'
import { parseTheme, THEME_COOKIE, themeClass } from '@/lib/theme'
import { DESIGN, NIGHT } from '@/lib/design'
import chosen from '@/design/chosen-design.json'
import './globals.css'

const serif = Literata({ variable: '--font-serif-face', subsets: ['latin'], weight: ['400', '600', '700'] })
const rounded = Hanken_Grotesk({ variable: '--font-rounded-face', subsets: ['latin'], weight: ['400', '500', '600', '700'] })

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
  '--night-bg': NIGHT.bg,
  '--night-surface': NIGHT.surface,
  '--night-text': NIGHT.text,
  '--night-muted': NIGHT.muted,
  '--night-accent': NIGHT.accent,
  '--night-accent2': NIGHT.accent2,
  '--glass': chosen.glass,
  '--glass-ink': chosen.glassInk,
  '--radius': `${DESIGN.radius}px`,
  '--scale': String(DESIGN.scale),
} as CSSProperties

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value)
  return (
    <html lang="en" style={themeVars} className={`${serif.variable} ${rounded.variable} h-full antialiased`}>
      <body className={`${themeClass(theme)} min-h-full flex flex-col`}>{children}</body>
    </html>
  )
}
