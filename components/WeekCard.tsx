import Link from 'next/link'
import { streakLabel } from '@/lib/copy'
import { scoreColor } from '@/lib/design'
import { Card } from './Card'

const WEEKDAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

type Props = { bars: { date: string; score: number | null }[]; today: string; streak: number; sleepAvg: number | null; firstTime?: string | null }

/** This week at a glance: 7 bars ending today (ringed), gaps dashed, each bar opens its day. */
export function WeekCard({ bars, today, streak, sleepAvg, firstTime }: Props) {
  const header = [streakLabel(streak), sleepAvg !== null ? `💤 ${sleepAvg}h avg` : null].filter(Boolean).join(' · ')
  return (
    <Card className="mb-3">
      <div className="mb-2 flex justify-between text-xs text-muted">
        <span className="font-semibold text-ink">This week</span>
        <span>{header}</span>
      </div>
      {firstTime ? (
        <p className="py-4 text-center text-sm text-muted">{firstTime}</p>
      ) : (
        <div className="flex h-20 items-end gap-1.5">
          {bars.map((b) => (
            <Link key={b.date} href={`/day/${b.date}`} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={`w-full rounded-[4px] ${b.score ? '' : 'border border-dashed border-line'} ${b.date === today ? 'ring-2 ring-accent' : ''}`}
                style={{ height: b.score ? `${b.score * 5.6}px` : '10px', background: b.score ? scoreColor(b.score) : 'transparent' }}
              />
              <span className="text-[10px] text-muted">{WEEKDAY[new Date(`${b.date}T12:00:00Z`).getUTCDay()]}</span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
