'use client'
import Link from 'next/link'
import { useState } from 'react'
import { streakLabel } from '@/lib/copy'
import { scoreColor } from '@/lib/design'
import { Card } from './Card'
import { Icon } from './Icon'

const WEEKDAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const dayName = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })

type Props = { bars: { date: string; score: number | null }[]; today: string; streak: number; sleepAvg: number | null; firstTime?: string | null }

/** This week: 7 bars on a baseline ending today. Hover or tap a bar for its score; tap again to open the day. */
export function WeekCard({ bars, today, streak, sleepAvg, firstTime }: Props) {
  const [active, setActive] = useState<string | null>(null)
  const streakText = streakLabel(streak)
  const shown = bars.find((b) => b.date === active)
  return (
    <Card className="mb-3">
      <div className="mb-3 flex justify-between text-xs text-muted">
        <span className="font-semibold text-ink">{shown ? `${dayName(shown.date)} · ${shown.score ?? 'no debrief'}` : 'This week'}</span>
        <span className="flex items-center gap-3">
          {streakText && <span className="flex items-center gap-1"><Icon name="flame" size={13} />{streakText}</span>}
          {sleepAvg !== null && <span className="flex items-center gap-1"><Icon name="sleep" size={13} />{sleepAvg}h avg</span>}
        </span>
      </div>
      {firstTime ? (
        <p className="py-4 text-center text-sm text-muted">{firstTime}</p>
      ) : (
        <>
          <div className="flex h-24 items-end gap-[2px] border-b border-line">
            {bars.map((b) => {
              const isActive = active === b.date
              return (
                <Link
                  key={b.date}
                  href={`/day/${b.date}`}
                  onMouseEnter={() => setActive(b.date)}
                  onMouseLeave={() => setActive(null)}
                  onClick={(e) => { if (active !== b.date && window.matchMedia('(hover: none)').matches) { e.preventDefault(); setActive(b.date) } }}
                  aria-label={`${dayName(b.date)}: ${b.score ?? 'no debrief'}`}
                  className="flex h-full flex-1 items-end px-[3px]"
                >
                  <span
                    className={`w-full rounded-t-[4px] ${b.score ? '' : 'border border-b-0 border-dashed border-line'} ${b.date === today && !b.score ? 'border-accent' : ''}`}
                    style={{
                      height: b.score ? `${b.score * 10}%` : '10%',
                      background: b.score ? scoreColor(b.score) : 'transparent',
                      opacity: active && !isActive ? 0.45 : 1,
                    }}
                  />
                </Link>
              )
            })}
          </div>
          <div className="mt-1 flex gap-[2px]">
            {bars.map((b) => (
              <span key={b.date} className={`flex-1 text-center text-[10px] ${b.date === today ? 'font-bold text-ink' : 'text-muted'}`}>
                {WEEKDAY[new Date(`${b.date}T12:00:00Z`).getUTCDay()]}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
