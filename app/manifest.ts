import type { MetadataRoute } from 'next'
import { DESIGN } from '@/lib/design'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Daily Debrief',
    short_name: 'Debrief',
    description: 'Five minutes a night. Learn what makes your good days good.',
    start_url: '/',
    display: 'standalone',
    background_color: DESIGN.colors.bg,
    theme_color: DESIGN.colors.bg,
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png' },
    ],
  }
}
