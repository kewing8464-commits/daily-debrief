'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { COPY } from '@/lib/copy'
import type { Turn } from '@/lib/conversation'
import { aiQuestion, dayNeighbors, filledSections, shortDate } from '@/lib/day-page'
import { scoreColor } from '@/lib/design'
import { ratingLabel } from '@/lib/ratings'
import type { DaySummary } from '@/lib/summary'
import { Bubble } from './Bubble'
import { Card } from './Card'
import { DayMenu } from './DayMenu'
import { SummaryForm } from './SummaryForm'

type Day = {
  day_date: string; score: number; summary: DaySummary; transcript: Turn[]; mode: 'type' | 'talk'; duration_sec: number | null
  timezone: string; updated_at: string; productive?: number | null; focus?: number | null; from_memory?: boolean
}
type View = 'summary' | 'chat'
const VIEW_KEY = 'dd.dayView'

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-card border border-line bg-surface p-2 text-center">
      <p className="font-semibold">{value}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  )
}

export function DayDetail({ date, today, day, connected, justSaved }: { date: string; today: string; day: Day | null; connected: boolean; justSaved: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DaySummary | null>(day?.summary ?? null)
  const [view, setView] = useState<View>('summary')
  const [menu, setMenu] = useState(false)
  const [error, setError] = useState('')
  const { prev, next } = dayNeighbors(date, today)
  const title = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
  const journalHref = `/calendar?month=${date.slice(0, 7)}`

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved choice after mount
      if (localStorage.getItem(VIEW_KEY) === 'chat') setView('chat')
    } catch {}
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editing || menu || (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))) return
      if (e.key === 'ArrowLeft') router.push(`/day/${prev}`)
      else if (e.key === 'ArrowRight' && next) router.push(`/day/${next}`)
      else if (e.key === 'Escape') router.push(journalHref)
      else if (e.key.toLowerCase() === 'e' && day) setEditing(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, prev, next, journalHref, editing, menu, day])

  function pickView(v: View) {
    setView(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch {}
  }

  const header = (
    <div className="mt-1 mb-3 flex items-center justify-between text-sm text-muted">
      <Link href={journalHref}>‹ Journal</Link>
      <span className="flex items-center gap-1">
        <Link href={`/day/${prev}`} aria-label="Previous day" className="px-2 text-lg">‹</Link>
        {shortDate(date)}
        {next ? <Link href={`/day/${next}`} aria-label="Next day" className="px-2 text-lg">›</Link> : <span className="px-2 text-lg opacity-30">›</span>}
      </span>
      {day ? <button onClick={() => setMenu(true)} aria-label="Day menu" className="px-2 text-lg">•••</button> : <span className="w-8" />}
    </div>
  )

  if (!day || !draft) {
    const old = date < dayNeighbors(today, today).prev
    return (
      <div className="mx-auto max-w-3xl">
        {header}
        <div className="py-16 text-center">
          <p className="text-4xl">🌙</p>
          <h1 className="mt-2 font-serif text-2xl">{COPY.emptyDay}</h1>
          <p className="mt-1 text-sm text-muted">Nothing was saved for {title}.</p>
          {date <= today && (
            <Link href={`/debrief?date=${date}`} className="mt-6 inline-block rounded-card bg-accent px-6 py-3 font-bold text-[#1e1714]">
              {old ? 'Add it from memory' : 'Debrief this day'}
            </Link>
          )}
        </div>
      </div>
    )
  }

  async function saveEdit() {
    const res = await fetch(`/api/days/${date}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        transcript: day!.transcript, summary: draft, score: draft!.score, productive: day!.productive ?? null, focus: day!.focus ?? null,
        fromMemory: day!.from_memory ?? false, mode: day!.mode, durationSec: day!.duration_sec ?? 0, timezone: day!.timezone,
        status: 'saved', expectedUpdatedAt: day!.updated_at,
      }),
    })
    if (res.status === 409) return setError('This day changed on another screen. Reload to see the latest, then edit again.')
    if (!res.ok) return setError('Saving failed, try again.')
    setEditing(false)
    router.refresh()
  }

  function download() {
    const blob = new Blob([JSON.stringify(day, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `debrief-${date}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMenu(false)
  }

  async function remove() {
    const res = await fetch(`/api/days/${date}`, { method: 'DELETE' })
    if (!res.ok) { setMenu(false); return setError('Could not delete that day. Try again.') }
    router.push(journalHref)
    router.refresh()
  }

  const s = day.summary
  const sections = filledSections(s)
  const productive = ratingLabel('productive', day.productive)
  const focus = ratingLabel('focus', day.focus)

  const summaryView = (
    <div className="grid gap-2 lg:grid-cols-3">
      {sections.map((x) => (
        <button key={x.key} onClick={() => setEditing(true)} className="rounded-card border border-line bg-surface p-3 text-left">
          <p className="font-semibold">{x.icon} {x.title}</p>
          <p className="mt-0.5 text-sm text-muted">{x.body}</p>
        </button>
      ))}
    </div>
  )
  const chatView = (
    <div>
      {day.transcript.length ? day.transcript.map((t, i) => <Bubble key={i} role={t.role} text={t.text} />) : <p className="text-sm text-muted">No conversation saved for this day.</p>}
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl">
      {header}
      {justSaved && <p className="mb-3 rounded-card border border-accent2 px-3 py-2 text-sm text-accent2">{COPY.saved}</p>}
      {error && <p className="mb-3 text-sm text-[#e89f88]">{error}</p>}

      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => setEditing(true)} aria-label="Change the score" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-extrabold text-[#1e1714]" style={{ background: scoreColor(day.score) }}>
          {day.score}
        </button>
        <div>
          <p className="text-[11px] tracking-wide text-muted uppercase">{title}{day.from_memory ? ' · from memory' : ''}</p>
          <h1 className="font-serif text-xl leading-snug lg:text-2xl">{s.oneLine || 'Your day'}</h1>
        </div>
      </div>
      {(s.tags.length > 0 || productive || focus) && (
        <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
          {productive && <span className="rounded-full bg-surface px-2.5 py-1">⚡ {productive}</span>}
          {focus && <span className="rounded-full bg-surface px-2.5 py-1">🎯 {focus}</span>}
          {s.tags.map((t) => (
            <Link key={t} href={`/calendar?month=${date.slice(0, 7)}&tag=${encodeURIComponent(t)}`} className="rounded-full border border-line px-2.5 py-1 text-muted">{t}</Link>
          ))}
        </div>
      )}
      <div className="mb-4 flex gap-2 lg:max-w-md">
        <Tile value={s.sleep?.hours ? `${s.sleep.hours}h` : '–'} label="sleep" />
        <Tile value={s.workout?.did ? (s.workout.minutes ? `${s.workout.minutes}m` : 'yes') : 'rest'} label="workout" />
        <Tile value={String(s.alcohol?.drinks ?? 0)} label="beers" />
      </div>

      {editing ? (
        <Card className="lg:max-w-2xl">
          <SummaryForm value={draft} onChange={setDraft} />
          <div className="flex gap-2">
            <button onClick={() => { setDraft(day.summary); setEditing(false) }} className="flex-1 rounded-card border border-line py-3">Cancel</button>
            <button onClick={saveEdit} className="flex-1 rounded-card bg-accent py-3 font-bold text-[#1e1714]">Save</button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex rounded-full bg-surface p-1 text-sm lg:hidden">
            {(['summary', 'chat'] as const).map((v) => (
              <button key={v} onClick={() => pickView(v)} className={`flex-1 rounded-full py-1.5 ${view === v ? 'bg-accent font-bold text-[#1e1714]' : 'text-muted'}`}>
                {v === 'summary' ? 'Summary' : 'Chat'}
              </button>
            ))}
          </div>
          <div className="lg:hidden">{view === 'summary' ? summaryView : chatView}</div>
          <div className="hidden gap-6 lg:grid lg:grid-cols-[1fr_340px]">
            {summaryView}
            <div className="rounded-card border border-line bg-surface p-3">
              <p className="mb-2 text-[10px] tracking-wide text-muted">THE CONVERSATION</p>
              {chatView}
            </div>
          </div>
        </>
      )}

      {menu && (
        <DayMenu
          dateLabel={shortDate(date)}
          connected={connected}
          question={aiQuestion(date, day.score)}
          onEdit={() => { setMenu(false); setEditing(true) }}
          onAdd={() => router.push(`/debrief?date=${date}`)}
          onDownload={download}
          onDelete={remove}
          onClose={() => setMenu(false)}
        />
      )}
    </div>
  )
}
