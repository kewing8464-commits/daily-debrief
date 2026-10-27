import Link from 'next/link'
import { redirect } from 'next/navigation'
import { TabBar } from '@/components/TabBar'
import { debriefDateFor, monthGrid, monthRange, shiftMonth } from '@/lib/dates'
import { scoreColor } from '@/lib/design'
import { getUser } from '@/lib/supabase/server'

export default async function CalendarPage({ searchParams }: PageProps<'/calendar'>) {
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single()
  const today = debriefDateFor(new Date(), profile?.timezone ?? 'UTC')
  const { month } = await searchParams
  const ym = typeof month === 'string' && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7)
  const [y, m] = ym.split('-').map(Number)
  const cells = monthGrid(y, m)

  const range = monthRange(ym)
  const { data: rows, error } = await supabase
    .from('days')
    .select('day_date, score')
    .eq('user_id', user.id)
    .eq('status', 'saved')
    .gte('day_date', range.from)
    .lt('day_date', range.before)
  if (error) throw new Error(`Could not load the calendar: ${error.message}`)
  const scores = new Map((rows ?? []).map((r) => [r.day_date as string, r.score as number]))
  const saved = [...scores.values()]
  const avg = saved.length ? (saved.reduce((a, b) => a + b, 0) / saved.length).toFixed(1) : null
  const title = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <main className="safe-top flex-1 px-4 pb-28">
      <div className="mt-1 mb-4 flex items-center justify-between">
        <Link href={`/calendar?month=${shiftMonth(ym, -1)}`} className="px-2 text-2xl text-muted">‹</Link>
        <h1 className="font-serif text-2xl">{title}</h1>
        <Link href={`/calendar?month=${shiftMonth(ym, 1)}`} className="px-2 text-2xl text-muted">›</Link>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="text-xs text-muted">{d}</span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={i} />
          const score = scores.get(date) ?? null
          const future = date > today
          return (
            <Link
              key={date}
              href={future ? '#' : `/day/${date}`}
              aria-disabled={future}
              className={`flex aspect-square items-center justify-center rounded-card text-sm font-semibold ${future ? 'pointer-events-none opacity-30' : ''} ${date === today ? 'ring-2 ring-ink' : ''}`}
              style={score ? { background: scoreColor(score), color: '#2a201b' } : { border: '1px dashed var(--muted)', color: 'var(--muted)' }}
            >
              {Number(date.slice(8))}
            </Link>
          )
        })}
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        {saved.length} {saved.length === 1 ? 'debrief' : 'debriefs'} this month{avg ? ` · average day ${avg}` : ''}
      </p>
      <TabBar active="calendar" />
    </main>
  )
}
