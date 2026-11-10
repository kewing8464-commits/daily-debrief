import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/Card'
import { PageHeader } from '@/components/PageHeader'
import type { SavedDay } from '@/lib/connector/journal'
import { debriefDateFor } from '@/lib/dates'
import { scoreColor, scoreInk } from '@/lib/design'
import { factorDetail, PERIODS, periodRange, type Period } from '@/lib/recipe'
import { getUser } from '@/lib/supabase/server'

const isPeriod = (v: unknown): v is Period => PERIODS.some((p) => p.id === v)

function Squares({ days }: { days: SavedDay[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {days.map((d) => (
        <Link
          key={d.day_date}
          href={`/day/${d.day_date}`}
          title={d.day_date}
          className="flex h-8 w-8 items-center justify-center rounded-[5px] text-xs font-extrabold"
          style={{ background: scoreColor(d.score), color: scoreInk(d.score) }}
        >
          {d.score}
        </Link>
      ))}
    </div>
  )
}

export default async function FactorPage({ params, searchParams }: PageProps<'/insights/factor/[id]'>) {
  const { id } = await params
  const sp = await searchParams
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
    supabase.from('days').select('day_date, score, summary, productive, focus').eq('user_id', user.id).eq('status', 'saved').order('day_date').limit(2000),
  ])
  const today = debriefDateFor(new Date(), profile?.timezone ?? 'UTC')
  const period: Period = isPeriod(sp.period) ? sp.period : 'month'
  const range = periodRange(period, today, typeof sp.month === 'string' ? sp.month : undefined)
  const days = ((rows ?? []).filter((r) => r.summary && r.score).map((r) => ({ ...r, transcript: [] })) as SavedDay[])
    .filter((d) => d.day_date >= range.start && d.day_date <= range.end)
  const detail = factorDetail(days, decodeURIComponent(id))
  const back = `/insights?period=${period}${period === 'month' ? `&month=${range.start.slice(0, 7)}` : ''}`

  return (
    <AppShell active="insights">
      <PageHeader kicker={<Link href={back}>‹ Insights</Link>} title={detail ? detail.factor.label : 'Pattern'} />
      {!detail ? (
        <Card className="text-center">
          <p className="font-serif text-xl">This pattern isn&apos;t in this period</p>
          <p className="mt-1 text-sm text-muted">Try a longer period on the Insights tab.</p>
        </Card>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">{range.label} · {detail.withDays.length} days with it vs {detail.withoutDays.length} without</p>
          <Card className="mb-4 flex justify-around text-center">
            <div>
              <p className="font-serif text-3xl text-accent2">{detail.withAvg}</p>
              <p className="text-xs text-muted">with it</p>
            </div>
            <div>
              <p className="font-serif text-3xl">{detail.withoutAvg}</p>
              <p className="text-xs text-muted">without</p>
            </div>
          </Card>
          <p className="mb-1.5 text-xs tracking-wide text-muted">DAYS WITH IT</p>
          <Squares days={detail.withDays} />
          <p className="mt-4 mb-1.5 text-xs tracking-wide text-muted">DAYS WITHOUT</p>
          <Squares days={detail.withoutDays} />
          {detail.alsoTrue.length > 0 && (
            <Card className="mt-5">
              <p className="text-xs tracking-wide text-muted">ALSO TRUE ON THESE DAYS</p>
              {detail.alsoTrue.map((t) => <p key={t} className="mt-1 text-sm">{t}</p>)}
              <p className="mt-2 text-[11px] text-muted">Things that tend to come together, so one habit doesn&apos;t get credit for another&apos;s work.</p>
            </Card>
          )}
          <Card className="mt-3">
            <p className="text-xs tracking-wide text-muted">WORTH TRYING</p>
            <p className="mt-1 text-sm">{detail.worthTrying}</p>
          </Card>
          <p className="mt-4 text-center text-[11px] text-muted">Patterns in your own entries, not proof of cause.</p>
        </>
      )}
    </AppShell>
  )
}
