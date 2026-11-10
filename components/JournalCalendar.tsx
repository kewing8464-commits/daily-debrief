'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cellStyle, dayIcons, LAYERS, legendFor, monthStats, statLayer, type CalDay, type Layer } from '@/lib/journal-layers'
import { DayPreview } from './DayPreview'

type Props = {
  ym: string
  title: string
  today: string
  cells: (string | null)[]
  days: CalDay[]
  prevHref: string
  nextHref: string | null
  todayHref: string | null
  insight: string
  tag: string | null
  clearTagHref: string
  noteDates: string[]
}

const LAYER_KEY = 'dd.layer'
const isLayer = (v: string | null): v is Layer => LAYERS.some((l) => l.id === v)
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

export function JournalCalendar({ title, today, cells, days, prevHref, nextHref, todayHref, insight, tag, clearTagHref, noteDates }: Props) {
  const router = useRouter()
  const [layer, setLayer] = useState<Layer>('mood')
  const [selected, setSelected] = useState<string | null>(null)
  const [peek, setPeek] = useState<string | null>(null)
  const byDate = useMemo(() => new Map(days.map((d) => [d.day_date, d])), [days])
  const notes = useMemo(() => new Set(noteDates), [noteDates])
  const stats = monthStats(days)
  const legend = legendFor(layer)
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null)
  const held = useRef(false)
  const swipeX = useRef<number | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYER_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved choice after mount
      if (isLayer(saved)) setLayer(saved)
    } catch {}
  }, [])

  function pickLayer(l: Layer) {
    setLayer(l)
    try { localStorage.setItem(LAYER_KEY, l) } catch {}
  }

  const savedDates = useMemo(() => days.map((d) => d.day_date).sort(), [days])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'ArrowLeft') router.push(prevHref)
      else if (e.key === 'ArrowRight' && nextHref) router.push(nextHref)
      else if (e.key.toLowerCase() === 't' && todayHref) router.push(todayHref)
      else if (e.key === 'Escape') { setSelected(null); setPeek(null) }
      else if (/^[1-6]$/.test(e.key)) pickLayer(LAYERS[Number(e.key) - 1].id)
      else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && savedDates.length) {
        e.preventDefault()
        const i = selected ? savedDates.indexOf(selected) : -1
        const next = e.key === 'ArrowDown' ? Math.min(savedDates.length - 1, i + 1) : Math.max(0, i - 1)
        setSelected(savedDates[next])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, prevHref, nextHref, todayHref, savedDates, selected])

  function openDay(date: string) {
    if (held.current) { held.current = false; return }
    if (isDesktop()) setSelected(date)
    else router.push(`/day/${date}`)
  }

  const startHold = (date: string) => {
    held.current = false
    hold.current = setTimeout(() => { held.current = true; setPeek(date) }, 500)
  }
  const endHold = () => { if (hold.current) clearTimeout(hold.current) }

  const statTile = (key: keyof typeof statLayer, value: string, label: string) => (
    <button
      key={key}
      onClick={() => pickLayer(statLayer[key])}
      className={`flex-1 rounded-card border bg-surface p-2 text-center ${layer === statLayer[key] ? 'border-accent' : 'border-line'}`}
    >
      <p className="font-bold">{value}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </button>
  )

  const selectedDay = selected ? byDate.get(selected) : undefined
  const peekDay = peek ? byDate.get(peek) : undefined

  return (
    <div className="lg:flex lg:gap-8">
      <div className="min-w-0 flex-1">
        <div className="mt-1 mb-3 flex items-center justify-between">
          <h1 className="font-serif text-[1.7rem] lg:text-3xl">Journal</h1>
          <div className="flex items-center gap-1 text-muted">
            <Link href={prevHref} aria-label="Previous month" className="px-2 text-xl">‹</Link>
            <span className="text-sm">{title}</span>
            {nextHref ? <Link href={nextHref} aria-label="Next month" className="px-2 text-xl">›</Link> : <span className="px-2 text-xl opacity-30">›</span>}
            {todayHref && <Link href={todayHref} className="ml-1 rounded-card border border-line px-2 py-0.5 text-xs">Today</Link>}
          </div>
        </div>

        <div className="mb-3 flex gap-2 lg:hidden">
          {statTile('avgScore', stats.avgScore?.toString() ?? '–', 'avg day')}
          {statTile('avgSleep', stats.avgSleep ? `${stats.avgSleep}h` : '–', 'sleep')}
          {statTile('workouts', String(stats.workouts), 'workouts')}
          {statTile('beers', String(stats.beers), 'beers')}
        </div>

        <div className="-mx-4 mb-1 flex gap-1.5 overflow-x-auto px-4 pb-1 text-xs lg:mx-0 lg:px-0">
          {LAYERS.map((l, i) => (
            <button
              key={l.id}
              onClick={() => pickLayer(l.id)}
              title={`Shortcut: ${i + 1}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 ${layer === l.id ? 'border-accent bg-accent font-bold text-[#1e1714]' : 'border-line'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="mb-2 flex items-center gap-1 text-[10px] text-muted">
          {legend.low}
          {legend.swatches.map((c, i) => <span key={i} className="h-2 w-4 rounded-sm border border-line" style={{ background: c }} />)}
          {legend.high} · dashed = nothing recorded · <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" /> vibe checks to wrap up
        </div>

        {tag && (
          <Link href={clearTagHref} className="mb-2 inline-block rounded-full border border-accent px-3 py-1 text-xs text-accent">
            Showing days tagged {tag} ✕
          </Link>
        )}

        <div
          className="grid grid-cols-7 gap-1 lg:gap-1.5"
          onTouchStart={(e) => { swipeX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (swipeX.current === null) return
            const dx = e.changedTouches[0].clientX - swipeX.current
            swipeX.current = null
            if (dx > 60) router.push(prevHref)
            else if (dx < -60 && nextHref) router.push(nextHref)
          }}
        >
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="text-center text-[10px] text-muted">{d}</span>)}
          {cells.map((date, i) => {
            if (!date) return <span key={i} />
            const d = byDate.get(date)
            const future = date > today
            const ring = date === today ? 'ring-2 ring-accent' : ''
            const dim = tag && !(d?.summary.tags ?? []).some((t) => t.toLowerCase() === tag.toLowerCase()) ? 'opacity-25' : ''
            const num = Number(date.slice(8))
            if (!d) {
              return (
                <button
                  key={date}
                  disabled={future}
                  onClick={() => router.push(`/day/${date}`)}
                  className={`aspect-square rounded-card border border-dashed border-line p-1 text-left text-[10px] text-muted lg:aspect-auto lg:h-20 ${future ? 'opacity-30' : ''} ${ring}`}
                >
                  {num}
                  {notes.has(date) && <span title="Vibe checks, not wrapped up yet" className="mt-1 block h-1.5 w-1.5 rounded-full bg-accent" />}
                </button>
              )
            }
            const style = cellStyle(layer, d)
            return (
              <button
                key={date}
                onClick={() => openDay(date)}
                onPointerDown={() => startHold(date)}
                onPointerUp={endHold}
                onPointerLeave={endHold}
                onContextMenu={(e) => e.preventDefault()}
                className={`flex aspect-square flex-col overflow-hidden rounded-card p-1 text-left select-none lg:aspect-auto lg:h-20 ${style.empty ? 'border border-dashed border-line text-ink' : ''} ${ring} ${dim} ${selected === date ? 'outline-2 outline-offset-1 outline-ink' : ''}`}
                style={style.empty ? undefined : { background: style.background, color: style.ink }}
              >
                <span className="text-[9px] opacity-70">{num}</span>
                <span className="text-center text-sm leading-none font-extrabold lg:text-lg">{d.score}</span>
                <span className="text-center text-[9px] leading-tight">{dayIcons(d)}</span>
                <span className="hidden truncate text-[9px] opacity-80 lg:block">{d.summary.oneLine}</span>
              </button>
            )
          })}
        </div>

        <Link href="/insights" className="mt-4 flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-3.5">
          <span>
            <span className="block font-semibold">💡 This month</span>
            <span className="text-sm text-muted">{insight}</span>
          </span>
          <span className="text-accent">›</span>
        </Link>
      </div>

      <aside className="hidden w-[300px] shrink-0 lg:block">
        <div className="sticky top-8 rounded-card border border-line bg-surface p-4">
          {selectedDay ? <DayPreview day={selectedDay} /> : <p className="text-sm text-muted">Click a day to see it here. Use ↑ ↓ to move between days.</p>}
          <p className="mt-5 mb-2 text-[10px] tracking-wide text-muted">THIS MONTH</p>
          <div className="grid grid-cols-2 gap-2">
            {statTile('avgScore', stats.avgScore?.toString() ?? '–', 'avg day')}
            {statTile('avgSleep', stats.avgSleep ? `${stats.avgSleep}h` : '–', 'sleep')}
            {statTile('workouts', String(stats.workouts), 'workouts')}
            {statTile('beers', String(stats.beers), 'beers')}
          </div>
        </div>
      </aside>

      {peekDay && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/50 lg:hidden" onClick={() => setPeek(null)}>
          <div className="safe-bottom w-full rounded-t-2xl border-t border-line bg-bg p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded bg-line" />
            <DayPreview day={peekDay} />
          </div>
        </div>
      )}
    </div>
  )
}
