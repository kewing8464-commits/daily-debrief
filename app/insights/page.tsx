import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/Card'
import { CopyText } from '@/components/CopyText'
import { TrendChart } from '@/components/TrendChart'
import type { SavedDay } from '@/lib/connector/journal'
import { COPY } from '@/lib/copy'
import { debriefDateFor } from '@/lib/dates'
import { scoreColor } from '@/lib/design'
import { ASK_YOUR_AI, insightsProgress, PATTERN_THRESHOLD } from '@/lib/insights'
import { headline, highlights, peopleScores, PERIODS, periodRange, recipe, series, TREND_METRICS, type Period } from '@/lib/recipe'
import { getUser } from '@/lib/supabase/server'

const isPeriod = (v: unknown): v is Period => PERIODS.some((p) => p.id === v)
const short = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7)
}

function Ring({ value }: { value: number | null }) {
  const pct = ((value ?? 0) / 10) * 100
  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--accent2) ${pct}%, color-mix(in srgb, var(--text) 12%, transparent) 0)` }}>
      <div className="flex h-[80px] w-[80px] flex-col items-center justify-center rounded-full bg-surface">
        <span className="font-serif text-2xl">{value ?? '–'}</span>
        <span className="text-[10px] text-muted">avg day</span>
      </div>
    </div>
  )
}

export default async function InsightsPage({ searchParams }: PageProps<'/insights'>) {
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')
  const sp = await searchParams
  const [{ data: profile }, { data: rows }, { data: connector }] = await Promise.all([
    supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
    supabase.from('days').select('day_date, score, summary, productive, focus').eq('user_id', user.id).eq('status', 'saved').order('day_date').limit(2000),
    supabase.from('connector_tokens').select('user_id').eq('user_id', user.id).maybeSingle(),
  ])
  const today = debriefDateFor(new Date(), profile?.timezone ?? 'UTC')
  const all = (rows ?? []).filter((r) => r.summary && r.score).map((r) => ({ ...r, transcript: [] })) as SavedDay[]
  const period: Period = isPeriod(sp.period) ? sp.period : 'month'
  const range = periodRange(period, today, typeof sp.month === 'string' ? sp.month : undefined)
  const inRange = (a: string, b: string) => all.filter((d) => d.day_date >= a && d.day_date <= b)
  const days = inRange(range.start, range.end)
  const prev = range.prevStart ? inRange(range.prevStart, range.prevEnd) : []
  const progress = insightsProgress(all.length)
  const ym = range.start.slice(0, 7)

  const head = headline(days, prev, period === 'month')
  const rec = recipe(days)
  const hl = highlights(days)
  const people = peopleScores(days).slice(0, 6)
  const trendSeries = Object.fromEntries(TREND_METRICS.map((m) => [m.id, series(days, m.id)]))

  const periodBar = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex rounded-full bg-surface p-1 text-xs">
        {PERIODS.map((p) => (
          <Link key={p.id} href={`/insights?period=${p.id}`} className={`rounded-full px-3 py-1.5 ${p.id === period ? 'bg-accent font-bold text-[#1e1714]' : 'text-muted'}`}>
            {p.label}
          </Link>
        ))}
      </div>
      {period === 'month' && (
        <span className="flex items-center gap-1 text-sm text-muted">
          <Link href={`/insights?period=month&month=${shiftMonth(ym, -1)}`} className="px-2 text-lg">‹</Link>
          {range.label}
          {ym < today.slice(0, 7) ? <Link href={`/insights?period=month&month=${shiftMonth(ym, 1)}`} className="px-2 text-lg">›</Link> : <span className="px-2 text-lg opacity-30">›</span>}
        </span>
      )}
    </div>
  )

  const askAi = (
    <div>
      <p className="mb-2 text-xs tracking-wide text-muted">ASK YOUR AI</p>
      {ASK_YOUR_AI.map((q) => (
        <Card key={q} className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span>{q}</span>
          <CopyText text={q} />
        </Card>
      ))}
      <p className="text-center text-xs text-muted">
        {connector ? 'Paste into Claude or ChatGPT with your Daily Debrief connector on.' : <>Connect your AI first in <Link href="/settings" className="text-accent">You</Link>, then paste these in.</>}
      </p>
    </div>
  )

  if (progress.remaining > 0) {
    return (
      <AppShell active="insights">
        <h1 className="mt-1 mb-4 font-serif text-[1.7rem] lg:text-3xl">Insights</h1>
        <Card className="mb-5 text-center">
          <p className="text-3xl">🌱</p>
          <p className="mt-1 font-serif text-xl">{COPY.stillLearning(progress.remaining)}</p>
          <p className="mt-1 text-sm text-muted">{all.length} of {PATTERN_THRESHOLD} debriefs. Your recipe for a good day shows up once there&apos;s enough to go on.</p>
          <div className="mt-3 h-2 rounded-full bg-[color-mix(in_srgb,var(--text)_12%,transparent)]">
            <div className="h-2 rounded-full bg-accent2" style={{ width: `${progress.pct}%` }} />
          </div>
        </Card>
        {askAi}
      </AppShell>
    )
  }

  return (
    <AppShell active="insights" wide>
      <div className="mx-auto max-w-6xl">
        <h1 className="mt-1 mb-3 font-serif text-[1.7rem] lg:text-3xl">Insights</h1>
        {periodBar}
        <div className="grid gap-x-4 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
          <div className="lg:col-start-1 lg:row-start-1">
            <Card className="mb-4 flex items-center gap-4">
              <Ring value={head.avg} />
              <div>
                <p className="font-serif text-lg leading-snug">{head.verdict}</p>
                <p className="mt-1 text-xs text-muted">
                  {head.count} debriefs · {head.great} great · {head.rough} rough
                  {head.change !== null && head.change !== 0 && <> · {head.change > 0 ? '▲' : '▼'} {Math.abs(head.change)} vs last {period === 'month' ? 'month' : 'period'}</>}
                </p>
              </div>
            </Card>
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <Card className="mb-4">
              <p className="font-serif text-xl">Your recipe for a good day</p>
              <p className="mb-2 text-xs text-muted">Points above or below your average of {head.avg ?? '–'}</p>
              {rec.length ? rec.map((r) => {
                const pos = r.diff >= 0
                const w = Math.min(Math.abs(r.diff) / 4, 1) * 50
                return (
                  <Link key={r.id} href={`/insights/factor/${encodeURIComponent(r.id)}?period=${period}${period === 'month' ? `&month=${ym}` : ''}`} className="block border-t border-line py-2.5 first:border-t-0">
                    <div className="flex justify-between">
                      <span>{r.label}</span>
                      <b className={pos ? 'text-accent2' : 'text-accent'}>{pos ? '+' : '−'}{Math.abs(r.diff)}</b>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="relative h-1.5 flex-1 rounded bg-[color-mix(in_srgb,var(--text)_12%,transparent)]">
                        <div className="absolute top-0 h-1.5 rounded" style={{ [pos ? 'left' : 'right']: '50%', width: `${w}%`, background: pos ? 'var(--accent2)' : 'var(--accent)' }} />
                        <div className="absolute -top-0.5 left-1/2 h-2.5 w-px bg-muted" />
                      </div>
                      <span className="w-14 text-right text-[10px] text-muted">{r.withDays} days ›</span>
                    </div>
                  </Link>
                )
              }) : <p className="py-3 text-sm text-muted">Not enough days in this period to compare yet. Try 3 months or All.</p>}
              <p className="mt-2 text-[11px] text-muted">Patterns in your own entries, not proof of cause.</p>
            </Card>
          </div>

          <div className="lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <Card className="mb-4">
              <p className="mb-2 font-semibold">Trends</p>
              <TrendChart metrics={TREND_METRICS} series={trendSeries} />
            </Card>
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              {hl.best && (
                <Link href={`/day/${hl.best.day_date}`} className="rounded-card border border-line bg-surface p-3">
                  <p className="font-semibold">Best day</p>
                  <p className="text-xs text-muted"><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: scoreColor(hl.best.score) }} />{short(hl.best.day_date)} · {hl.best.score}</p>
                </Link>
              )}
              {hl.toughest && (
                <Link href={`/day/${hl.toughest.day_date}`} className="rounded-card border border-line bg-surface p-3">
                  <p className="font-semibold">Toughest</p>
                  <p className="text-xs text-muted"><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: scoreColor(hl.toughest.score) }} />{short(hl.toughest.day_date)} · {hl.toughest.score}</p>
                </Link>
              )}
              {hl.bestWeek && (
                <Link href={`/calendar?month=${hl.bestWeek.start.slice(0, 7)}`} className="rounded-card border border-line bg-surface p-3">
                  <p className="font-semibold">Best week</p>
                  <p className="text-xs text-muted">{short(hl.bestWeek.start)} to {short(hl.bestWeek.end)} · {hl.bestWeek.avg}</p>
                </Link>
              )}
              <div className="rounded-card border border-line bg-surface p-3">
                <p className="font-semibold">Longest streak</p>
                <p className="text-xs text-muted">{hl.longestStreak} {hl.longestStreak === 1 ? 'day' : 'days'}</p>
              </div>
            </div>
            {askAi}
          </div>
          <div className="mt-4 lg:col-start-1 lg:row-start-2 lg:mt-0">
              <Card className="mb-4">
              <p className="mb-2 font-semibold">People</p>
              {people.length ? people.map((p) => (
                <div key={p.name} className="flex justify-between border-t border-line py-1.5 text-sm first:border-t-0">
                  <span>{p.name}</span>
                  <span className="text-muted">{p.days} days · <b className="text-ink">{p.avg}</b></span>
                </div>
              )) : <p className="text-sm text-muted">Nobody came up on 2+ days in this period.</p>}
              <p className="mt-2 text-[11px] text-muted">Average day score when they come up.</p>
            </Card>
          </div>
        </div>
        <p className="mt-6 text-center text-[11px] text-muted">{range.label} · {short(range.start)} to {short(range.end)}</p>
      </div>
    </AppShell>
  )
}
