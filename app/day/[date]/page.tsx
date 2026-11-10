import { notFound, redirect } from 'next/navigation'
import { DayDetail } from '@/components/DayDetail'
import { AppShell } from '@/components/AppShell'
import { getUser } from '@/lib/supabase/server'

export default async function DayPage({ params }: PageProps<'/day/[date]'>) {
  const { date } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')
  const { data } = await supabase.from('days').select('*').eq('user_id', user.id).eq('day_date', date).maybeSingle()
  return (
    <AppShell active="journal" wide>
      <DayDetail date={date} day={data?.status === 'saved' ? data : null} />
    </AppShell>
  )
}
