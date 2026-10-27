'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Turn } from '@/lib/conversation'
import type { DaySummary } from '@/lib/summary'
import { Bubble } from './Bubble'
import { Card } from './Card'
import { ScoreChip } from './ScoreChip'
import { SummaryForm } from './SummaryForm'

type Day = { day_date: string; score: number; summary: DaySummary; transcript: Turn[]; mode: 'type' | 'talk'; duration_sec: number | null; timezone: string; updated_at: string }

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 border-t border-line py-2 text-[15px]">
      <span className="w-24 shrink-0 text-muted">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export function DayDetail({ date, day }: { date: string; day: Day | null }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DaySummary | null>(day?.summary ?? null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [error, setError] = useState('')
  const title = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })

  if (!day || !draft) {
    return (
      <>
        <h1 className="mt-1 mb-3 font-serif text-2xl">{title}</h1>
        <Card>
          <p className="mb-3 text-muted">No debrief for this day.</p>
          <Link href={`/debrief?date=${date}`} className="block rounded-card bg-accent py-3 text-center font-bold text-[#1e1714]">Debrief this day</Link>
        </Card>
      </>
    )
  }

  async function saveEdit() {
    const res = await fetch(`/api/days/${date}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transcript: day!.transcript, summary: draft, score: draft!.score, mode: day!.mode, durationSec: day!.duration_sec ?? 0, timezone: day!.timezone, status: 'saved', expectedUpdatedAt: day!.updated_at }),
    })
    if (res.status === 409) return setError('This day changed on another screen. Reload to see the latest, then edit again.')
    if (!res.ok) return setError('Saving failed, try again.')
    setEditing(false)
    router.refresh()
  }

  const s = day.summary
  const sleep = [s.sleep.bedtime && `asleep ${s.sleep.bedtime}`, s.sleep.wake && `up ${s.sleep.wake}`, s.sleep.hours && `${s.sleep.hours}h`].filter(Boolean).join(' · ')
  const workout = s.workout.did ? [s.workout.type || 'yes', s.workout.minutes && `${s.workout.minutes} min`].filter(Boolean).join(' · ') : null
  const work = [s.work.meetings !== undefined && `${s.work.meetings} ${s.work.meetings === 1 ? "meeting" : "meetings"}`, s.work.good, s.work.bad].filter(Boolean).join(' · ')

  return (
    <>
      <div className="mt-1 mb-3 flex items-center justify-between">
        <h1 className="font-serif text-2xl">{title}</h1>
        <ScoreChip score={day.score} size="lg" />
      </div>
      {editing ? (
        <Card>
          <SummaryForm value={draft} onChange={setDraft} />
          {error && <p className="mb-2 text-sm text-[#e89f88]">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setDraft(day.summary); setEditing(false) }} className="flex-1 rounded-card border border-line py-3">Cancel</button>
            <button onClick={saveEdit} className="flex-1 rounded-card bg-accent py-3 font-bold text-[#1e1714]">Save</button>
          </div>
        </Card>
      ) : (
        <Card>
          {s.oneLine && <p className="mb-3 font-serif text-[17px] leading-snug italic">&ldquo;{s.oneLine}&rdquo;</p>}
          <Row label="😴 Sleep" value={sleep} />
          <Row label="☀️ Morning" value={s.morning} />
          <Row label="📍 Did" value={s.did} />
          <Row label="🍽 Ate" value={s.food.map((f) => (f.amount ? `${f.amount} ${f.item}` : f.item)).join(', ')} />
          <Row label="💪 Workout" value={workout} />
          <Row label="🍺 / 🌿" value={`${s.alcohol.drinks} ${s.alcohol.drinks === 1 ? 'drink' : 'drinks'} · ${s.cannabis.used ? `weed${s.cannabis.amount ? ` (${s.cannabis.amount})` : ''}` : 'no weed'}`} />
          <Row label="💼 Work" value={work} />
          <Row label="👥 People" value={s.people.map((p) => `${p.name} ${p.feeling === 'positive' ? '🙂' : p.feeling === 'negative' ? '😕' : ''}`).join(', ')} />
          <Row label="🎉 Fun" value={s.fun} />
          <Row label="😊 Happy" value={s.happy} />
          <Row label="😤 Annoyed" value={s.annoyed} />
          <Row label="✨ Stood out" value={s.standout} />
          <button onClick={() => setEditing(true)} className="mt-3 w-full rounded-card border border-accent py-2.5 font-semibold text-accent">Edit</button>
        </Card>
      )}
      <button onClick={() => setShowTranscript(!showTranscript)} className="mt-4 mb-2 text-sm text-accent">
        {showTranscript ? 'Hide the conversation' : 'Read the full conversation ›'}
      </button>
      {showTranscript && day.transcript.map((t, i) => <Bubble key={i} role={t.role} text={t.text} />)}
    </>
  )
}
