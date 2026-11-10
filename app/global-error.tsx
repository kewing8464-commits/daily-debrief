'use client'
import { ErrorScreen } from '@/components/ErrorScreen'
import './globals.css'

// Replaces the root layout when it fails, so it brings its own <html> and <body>.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: '#f2eee7', color: '#1f1c19', fontFamily: 'system-ui, sans-serif' }}>
        <ErrorScreen error={error} retry={retry} />
      </body>
    </html>
  )
}
