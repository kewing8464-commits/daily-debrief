'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** On a computer, Today has this box: type what just happened, press Enter, done. */
export function VibeInline() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function save() {
    if (!text.trim() || busy) return
    setBusy(true)
    const res = await fetch('/api/vibe-checks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) }).catch(() => null)
    setBusy(false)
    if (!res?.ok) return setNote("Couldn't save that. Try again.")
    setText('')
    setNote('Saved ✓')
    setTimeout(() => setNote(''), 2000)
    router.refresh()
  }

  return (
    <div className="mb-3 hidden lg:block">
      <input
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
        placeholder="What just happened? Type a vibe check and press Enter…"
        className="w-full rounded-card border border-accent bg-surface px-3.5 py-3 outline-none placeholder:text-muted"
      />
      {note && <p className="mt-1 text-xs text-accent2">{note}</p>}
    </div>
  )
}
