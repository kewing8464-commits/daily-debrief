import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { DayDetail } from '@/components/DayDetail'
import { debriefDateFor } from '@/lib/dates'
import { getUser } from '@/lib/supabase/server'
import type { VibeCheck } from '@/lib/vibe-checks'

export default async function DayPage({ params, searchParams }: PageProps<'/day/[date]'>) {
  const { date } = await params
  const { saved } = await searchParams
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')
  const [{ data }, { data: profile }, { data: connector }, { data: checks }] = await Promise.all([
    supabase.from('days').select('*').eq('user_id', user.id).eq('day_date', date).maybeSingle(),
    supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
    supabase.from('connector_tokens').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('vibe_checks').select('*').eq('user_id', user.id).eq('day_date', date).order('created_at'),
  ])
  const today = debriefDateFor(new Date(), profile?.timezone ?? 'UTC')
  return (
    <AppShell active="journal" wide>
      <DayDetail key={date} date={date} today={today} day={data?.status === 'saved' ? data : null} connected={!!connector} justSaved={saved === '1'} checks={(checks ?? []) as VibeCheck[]} tz={profile?.timezone ?? 'UTC'} />
    </AppShell>
  )
}
