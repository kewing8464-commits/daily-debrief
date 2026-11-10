'use client'
import { useState } from 'react'
import { scoreColor, scoreInk } from '@/lib/design'
import { timelineItems, VIBE_TAGS, vibeTime, type VibeCheck } from '@/lib/vibe-checks'
import { VibeCheckSheet } from './VibeCheckSheet'

const tagLabel = (id: string) => VIBE_TAGS.find((t) => t.id === id)?.label ?? id

/** Vibe checks (orange) and the night debrief (green) in time order. Tap a vibe check to edit or delete it. */
export function VibeTimeline({ checks, tz, debrief, empty }: { checks: VibeCheck[]; tz: string; debrief?: { at: string; score: number } | null; empty?: string }) {
  const [editing, setEditing] = useState<VibeCheck | null>(null)
  const items = timelineItems(checks, debrief ?? null)
  if (!items.length) return empty ? <p className="text-sm text-muted">{empty}</p> : null
  return (
    <div>
      {items.map((item, i) => (
        <div key={item.kind === 'vibe' ? item.check.id : 'debrief'} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.kind === 'vibe' ? 'bg-accent' : 'bg-accent2'}`} />
            {i < items.length - 1 && <span className="w-0.5 flex-1 bg-line" />}
          </div>
          {item.kind === 'vibe' ? (
            <button onClick={() => setEditing(item.check)} className="mb-3 flex-1 text-left">
              <p className="text-[11px] text-muted">{vibeTime(item.at, tz)} · vibe check</p>
              <p className="text-[15px]">{item.check.text}</p>
              {item.check.tags.length > 0 && <p className="mt-0.5 text-[11px] text-muted">{item.check.tags.map(tagLabel).join(' · ')}</p>}
            </button>
          ) : (
            <div className="mb-3 flex flex-1 items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold" style={{ background: scoreColor(item.score), color: scoreInk(item.score) }}>{item.score}</span>
              <p className="text-[15px]"><span className="text-[11px] text-muted">{vibeTime(item.at, tz)} · </span>Night debrief, locked in</p>
            </div>
          )}
        </div>
      ))}
      {editing && <VibeCheckSheet editing={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
