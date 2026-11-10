'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { VIBE_TAGS, type VibeCheck } from '@/lib/vibe-checks'

/** The vibe check panel: new (no `editing`) or edit/delete an existing one. Bottom sheet on phones, centered card on computers. */
export function VibeCheckSheet({ editing, onClose }: { editing?: VibeCheck; onClose: () => void }) {
  const router = useRouter()
  const [text, setText] = useState(editing?.text ?? '')
  const [tags, setTags] = useState<string[]>(editing?.tags ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save() {
    if (!text.trim() || busy) return
    setBusy(true)
    setError('')
    const res = await fetch(editing ? `/api/vibe-checks/${editing.id}` : '/api/vibe-checks', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, tags }),
    }).catch(() => null)
    setBusy(false)
    if (!res?.ok) return setError("Couldn't save that. Check your connection and try again.")
    onClose()
    router.refresh()
  }

  async function remove() {
    if (!editing) return
    setBusy(true)
    const res = await fetch(`/api/vibe-checks/${editing.id}`, { method: 'DELETE' }).catch(() => null)
    setBusy(false)
    if (!res?.ok) return setError("Couldn't delete that. Try again.")
    onClose()
    router.refresh()
  }

  const toggle = (id: string) => setTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/55 lg:items-center lg:justify-center" onClick={onClose}>
      <div className="safe-bottom w-full rounded-t-2xl border-t border-line bg-surface px-4 pt-3 lg:max-w-md lg:rounded-card lg:border lg:pb-4" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded bg-line lg:hidden" />
        <p className="font-serif text-lg">{editing ? 'Edit vibe check' : 'What just happened?'}</p>
        <textarea
          autoFocus
          rows={3}
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save() }}
          placeholder="Lunch with Galen, felt good about the move…"
          className="mt-2 w-full resize-none rounded-card border border-line bg-bg p-3 text-base outline-none focus:border-accent"
        />
        <p className="mt-1 text-xs text-muted">Tip: tap 🎙 on your keyboard to talk instead of type.</p>
        <p className="mt-3 mb-1.5 text-xs text-muted">Tag it (optional)</p>
        <div className="flex flex-wrap gap-1.5">
          {VIBE_TAGS.map((t) => (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className={`rounded-full border px-3 py-1.5 text-xs ${tags.includes(t.id) ? 'border-accent2 bg-accent2 font-bold text-[#1e1714]' : 'border-line'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-[#e89f88]">{error}</p>}
        {confirmDelete ? (
          <div className="mt-4 mb-3 flex gap-2">
            <button onClick={remove} disabled={busy} className="flex-1 rounded-card bg-[#e89f88] py-3 font-bold text-[#1e1714]">Delete it</button>
            <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-card border border-line py-3">Keep it</button>
          </div>
        ) : (
          <div className="mt-4 mb-3 flex gap-2">
            {editing ? (
              <button onClick={() => setConfirmDelete(true)} className="rounded-card border border-line px-4 py-3 text-[#e89f88]">Delete</button>
            ) : (
              <button onClick={onClose} className="flex-1 rounded-card border border-line py-3">Cancel</button>
            )}
            <button onClick={save} disabled={busy || !text.trim()} className="flex-[2] rounded-card bg-accent py-3 font-bold text-[#1e1714] disabled:opacity-50">
              {busy ? 'Saving…' : editing ? 'Save' : 'Save vibe check'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
