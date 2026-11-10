import { redirect } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { JournalCalendar } from '@/components/JournalCalendar'
import { COPY } from '@/lib/copy'
import { debriefDateFor, monthGrid, monthRange, shiftMonth } from '@/lib/dates'
import { PATTERN_THRESHOLD } from '@/lib/insights'
import { insightLine, type CalDay } from '@/lib/journal-layers'
import { getUser } from '@/lib/supabase/server'

export default async function CalendarPage({ searchParams }: PageProps<'/calendar'>) {
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single()
  const today = debriefDateFor(new Date(), profile?.timezone ?? 'UTC')
  const { month, tag } = await searchParams
  const ym = typeof month === 'string' && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7)
  const [y, m] = ym.split('-').map(Number)
  const range = monthRange(ym)

  const [{ data: rows, error }, { count }] = await Promise.all([
    supabase
      .from('days')
      .select('day_date, score, summary, productive, focus')
      .eq('user_id', user.id)
      .eq('status', 'saved')
      .gte('day_date', range.from)
      .lt('day_date', range.before),
    supabase.from('days').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'saved'),
  ])
  if (error) throw new Error(`Could not load the calendar: ${error.message}`)
  const days = (rows ?? []).filter((r) => r.summary && r.score) as CalDay[]
  const totalSaved = count ?? 0
  const insight = insightLine(days.map((d) => ({ ...d, transcript: [] })), totalSaved)
    ?? (totalSaved < PATTERN_THRESHOLD ? COPY.stillLearning(PATTERN_THRESHOLD - totalSaved) : 'Nothing stands out this month yet.')

  const current = today.slice(0, 7)
  const next = shiftMonth(ym, 1)
  const tagValue = typeof tag === 'string' && tag.trim() ? tag.trim().slice(0, 40) : null
  const withTag = (target: string) => `/calendar?month=${target}${tagValue ? `&tag=${encodeURIComponent(tagValue)}` : ''}`

  return (
    <AppShell active="journal" wide>
      <JournalCalendar
        ym={ym}
        title={new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
        today={today}
        cells={monthGrid(y, m)}
        days={days}
        prevHref={withTag(shiftMonth(ym, -1))}
        nextHref={next <= current ? withTag(next) : null}
        todayHref={ym === current ? null : withTag(current)}
        insight={insight}
        tag={tagValue}
        clearTagHref={`/calendar?month=${ym}`}
      />
    </AppShell>
  )
}
