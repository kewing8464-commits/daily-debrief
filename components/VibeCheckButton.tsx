'use client'
import { useEffect, useState } from 'react'
import { VibeCheckSheet } from './VibeCheckSheet'

/**
 * "+ Vibe check". `fab`: the floating thumb button on phones (Today). `sidebar`: the computer sidebar
 * button, which also listens for the N shortcut anywhere it isn't typing.
 */
export function VibeCheckButton({ variant }: { variant: 'fab' | 'sidebar' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (variant !== 'sidebar') return
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable)) return
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); setOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [variant])

  return (
    <>
      {variant === 'fab' ? (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-24 z-20 rounded-full bg-accent px-5 py-3 font-extrabold text-[#1e1714] shadow-[0_6px_18px_rgba(0,0,0,0.45)] lg:hidden"
        >
          ＋ Vibe check
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="mb-2 rounded-card border border-accent py-2 text-center font-semibold text-accent">
          ＋ Vibe check <span className="text-xs opacity-60">N</span>
        </button>
      )}
      {open && <VibeCheckSheet onClose={() => setOpen(false)} />}
    </>
  )
}
