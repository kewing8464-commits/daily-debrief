'use client'
import { useState } from 'react'

/** A small "Copy" link that copies text and says so. */
export function CopyText({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch {
      setDone(false)
    }
  }
  return (
    <button onClick={copy} className="shrink-0 text-sm font-semibold text-accent">
      {done ? 'Copied ✓' : label}
    </button>
  )
}
