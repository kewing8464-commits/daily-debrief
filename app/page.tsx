import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/Card'
import { WeekCard } from '@/components/WeekCard'
import { COPY, streakLabel } from '@/lib/copy'
import { debriefDateFor } from '@/lib/dates'
import { scoreColor } from '@/lib/design'
import { greetingFor } from '@/lib/greeting'
import { insightLine } from '@/lib/journal-layers'
import { bestStreak, weekStats, type DayRow } from '@/lib/stats'
import type { DaySummary } from '@/lib/summary'
import { getUser } from '@/lib/supabase/server'
import { prettyTime, startButton, toMinutes } from '@/lib/today'

type Row = DayRow & { summary: DaySummary | null }

function ScoreCircle({ score, size = 'h-12 w-12 text-xl' }: { score: number; size?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-extrabold text-[#1e1714] ${size}`} style={{ background: scoreColor(score) }}>
      {score}
    </span>
  )
}

export default async function Today() {
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('name, timezone, debrief_time').eq('id', user.id).single()
  if (!profile) redirect('/setup')

  const now = new Date()
  const today = debriefDateFor(now, profile.timezone)
  const clock = new Intl.DateTimeFormat('en-US', { timeZone: profile.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
  const nowMin = toMinutes(clock)
  const hour = Math.floor(nowMin / 60)
  const { data: rows } = await supabase
    .from('days')
    .select('day_date, score, status, summary')
    .eq('user_id', user.id)
    .order('day_date', { ascending: false })
    .limit(400)
  const days = (rows ?? []) as Row[]
  const saved = days.filter((d) => d.status === 'saved' && d.summary && d.score)
  const stats = weekStats(days, today)
  const todayRow = saved.find((d) => d.day_date === today)
  const yesterday = saved.find((d) => d.day_date < today)
  const best = bestStreak(days)
  const insight = insightLine(saved.slice(0, 60).map((d) => ({ day_date: d.day_date, score: d.score!, summary: d.summary!, transcript: [] })), saved.length)
  const debriefTime = prettyTime(String(profile.debrief_time))
  const start = startButton(nowMin, toMinutes(String(profile.debrief_time)), !!todayRow)
  const dateLine = new Date(`${today}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })

  const tonight = todayRow ? (
    <Card className="mb-3">
      <div className="flex items-center gap-3">
        <ScoreCircle score={todayRow.score!} />
        <div>
          <p className="font-semibold">{COPY.saved}</p>
          <p className="text-sm text-muted">{todayRow.summary?.oneLine}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link href={`/day/${today}`} className="flex-1 rounded-card border border-line py-2.5 text-center text-sm font-semibold">View day</Link>
        <Link href={`/debrief?date=${today}`} className="flex-1 rounded-card border border-line py-2.5 text-center text-sm font-semibold">＋ Add something</Link>
      </div>
    </Card>
  ) : start === 'prominent' ? (
    <Card className="mb-3 border-accent">
      <p className="font-serif text-xl">Vibe check time 🌙</p>
      <p className="mb-3 text-sm text-muted">How&apos;d today hit? About 5 minutes, talk or type.</p>
      <Link href={`/debrief?date=${today}`} className="block rounded-card bg-accent py-3 text-center font-bold text-[#1e1714]">Start tonight&apos;s debrief</Link>
    </Card>
  ) : (
    <Card className="mb-3 flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold">Tonight&apos;s debrief</p>
        <p className="text-sm text-muted">{debriefTime} · about 5 minutes</p>
      </div>
      {start === 'normal' ? (
        <Link href={`/debrief?date=${today}`} className="rounded-card bg-accent px-3 py-2 text-sm font-bold text-[#1e1714]">Start now</Link>
      ) : (
        <span className="text-xl text-muted">🌙</span>
      )}
    </Card>
  )

  const week = (
    <WeekCard bars={stats.bars} today={today} streak={stats.streak} sleepAvg={stats.sleepAvg} firstTime={saved.length === 0 ? COPY.firstDebrief(debriefTime) : null} />
  )
  const insightCard = insight && (
    <Link href="/insights" className="mb-3 block rounded-card border border-line bg-surface p-3.5">
      <p className="text-[10px] tracking-wide text-muted">FROM YOUR JOURNAL</p>
      <p className="mt-1">{insight}</p>
    </Link>
  )
  const streakCard = todayRow && stats.streak > 0 && (
    <Card className="mb-3 flex justify-between">
      <span className="font-semibold">{streakLabel(stats.streak)}</span>
      <span className="text-sm text-muted">best: {best}</span>
    </Card>
  )
  const yesterdayCard = yesterday && (
    <Link href={`/day/${yesterday.day_date}`} className="mb-3 hidden rounded-card border border-line bg-surface p-3.5 lg:block">
      <p className="text-[10px] tracking-wide text-muted">LAST DEBRIEF · {new Date(`${yesterday.day_date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).toUpperCase()}</p>
      <div className="mt-2 flex items-center gap-3">
        <ScoreCircle score={yesterday.score!} size="h-9 w-9 text-base" />
        <span className="text-sm">{yesterday.summary?.oneLine}</span>
      </div>
    </Link>
  )

  return (
    <AppShell active="today" wide>
      <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[1.3fr_1fr] lg:gap-8">
        <div>
          <p className="mt-1 text-sm text-muted">{dateLine}</p>
          <h1 className="mb-4 font-serif text-[1.7rem] leading-tight lg:text-3xl">
            {todayRow ? greetingFor(hour, true) : `${greetingFor(hour, false)}, ${profile.name}`}
          </h1>
          {tonight}
          {streakCard}
        </div>
        <div className="lg:pt-12">
          {week}
          {yesterdayCard}
          {insightCard}
        </div>
      </div>
    </AppShell>
  )
}
