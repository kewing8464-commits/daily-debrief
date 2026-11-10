import Link from 'next/link'
import { scoreColor, scoreInk } from '@/lib/design'
import type { CalDay } from '@/lib/journal-layers'
import { ratingLabel } from '@/lib/ratings'

const longDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-2 text-center">
      <p className="font-semibold">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  )
}

/** A quick look at one day: used in the Journal side panel (computer) and the press-and-hold peek (phone). */
export function DayPreview({ day }: { day: CalDay }) {
  const s = day.summary
  const productive = ratingLabel('productive', day.productive)
  const focus = ratingLabel('focus', day.focus)
  return (
    <div>
      <p className="text-xs tracking-wide text-muted uppercase">{longDate(day.day_date)}</p>
      <div className="my-2 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-extrabold" style={{ background: scoreColor(day.score), color: scoreInk(day.score) }}>
          {day.score}
        </span>
        <p className="font-serif text-[17px] leading-snug">{s.oneLine || 'No recap for this day.'}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Tile value={s.sleep?.hours ? `${s.sleep.hours}h` : '–'} label="sleep" />
        <Tile value={s.workout?.did ? (s.workout.minutes ? `${s.workout.minutes}m` : 'yes') : 'rest'} label="workout" />
        <Tile value={String(s.alcohol?.drinks ?? 0)} label="beers" />
      </div>
      {(productive || focus) && (
        <p className="mt-2 text-sm text-muted">
          {productive && <>⚡ {productive}</>}
          {productive && focus && ' · '}
          {focus && <>🎯 {focus}</>}
        </p>
      )}
      {s.happy && <p className="mt-2 text-sm"><span className="text-muted">Happy: </span>{s.happy}</p>}
      <Link href={`/day/${day.day_date}`} className="mt-3 block rounded-card border border-line py-2 text-center text-sm font-semibold">
        Open day
      </Link>
    </div>
  )
}
