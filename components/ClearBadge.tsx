'use client'
import { useEffect } from 'react'

/** Clears the "1" on the app icon once tonight's debrief is saved. */
export function ClearBadge() {
  useEffect(() => {
    const nav = navigator as Navigator & { clearAppBadge?: () => Promise<void> }
    nav.clearAppBadge?.().catch(() => {})
  }, [])
  return null
}
