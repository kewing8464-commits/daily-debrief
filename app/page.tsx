import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card } from '@/components/Card'
import { ScoreChip } from '@/components/ScoreChip'
import { TabBar } from '@/components/TabBar'
import { debriefDateFor } from '@/lib/dates'
import { scoreColor } from '@/lib/design'
import { greetingFor } from '@/lib/greeting'
import { weekStats, type DayRow } from '@/lib/stats'
import { getUser } from '@/lib/supabase/server'

const WEEKDAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default async function Home() {
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('name, timezone').eq('id', user.id).single()
  if (!profile) redirect('/setup')

  const now = new Date()
  const today = debriefDateFor(now, profile.timezone)
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: profile.timezone, hour: '2-digit', hourCycle: 'h23' }).format(now))
  const { data: rows } = await supabase
    .from('days')
    .select('day_date, score, status, summary')
    .eq('user_id', user.id)
    .order('day_date', { ascending: false })
    .limit(60)
  const days = (rows ?? []) as DayRow[]
  const stats = weekStats(days, today)
  const todayRow = days.find((d) => d.day_date === today && d.status === 'saved')

  return (
    <main className="safe-top flex-1 px-4 pb-28">
      <p className="mt-1 text-sm text-muted">
        {new Date(`${today}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
      </p>
      <h1 className="mb-4 font-serif text-[1.7rem] leading-tight">
        {greetingFor(hour)}, {profile.name} {hour >= 4 && hour < 17 ? '☀️' : '🌙'}
      </h1>

      <Card className="mb-3">
        <p className="text-xs text-muted">Tonight</p>
        {todayRow ? (
          <div className="mt-1 flex items-center justify-between">
            <span className="font-serif text-xl text-accent">Done for today ✓</span>
            <ScoreChip score={todayRow.score} />
          </div>
        ) : (
          <p className="mt-1 mb-3 font-serif text-xl text-accent">Ready when you are</p>
        )}
        <Link
          href="/debrief"
          className={`mt-3 block rounded-card py-3 text-center font-bold ${todayRow ? 'border border-accent text-accent' : 'bg-accent text-[#1e1714]'}`}
        >
          {todayRow ? 'Add to today' : "Start tonight's debrief"}
        </Link>
        <p className="mt-2 text-center text-xs text-muted">about 5 minutes · talk or type</p>
      </Card>

      <Card className="mb-3">
        <div className="mb-2 flex justify-between text-xs text-muted">
          <span>Your week</span>
          <span>{stats.bars.filter((b) => b.score !== null).length} of 7 days</span>
        </div>
        <div className="flex h-16 items-end gap-1.5">
          {stats.bars.map((b) => (
            <Link key={b.date} href={`/day/${b.date}`} className="flex flex-1 flex-col items-center gap-1">
              <span
                className="w-full rounded-[3px]"
                style={{ height: b.score ? `${b.score * 4.4}px` : '3px', background: b.score ? scoreColor(b.score) : 'var(--muted)', opacity: b.score ? 1 : 0.35 }}
              />
              <span className="text-[10px] text-muted">{WEEKDAY[new Date(`${b.date}T12:00:00Z`).getUTCDay()]}</span>
            </Link>
          ))}
        </div>
      </Card>

      <div className="flex gap-3">
        <Card className="flex-1">
          <p className="text-xs text-muted">🔥 Streak</p>
          <p className="font-serif text-2xl">{stats.streak} {stats.streak === 1 ? 'day' : 'days'}</p>
        </Card>
        <Card className="flex-1">
          <p className="text-xs text-muted">😴 Sleep avg</p>
          <p className="font-serif text-2xl">{stats.sleepAvg === null ? '–' : `${stats.sleepAvg}h`}</p>
        </Card>
      </div>
      <TabBar active="home" />
    </main>
  )
}
