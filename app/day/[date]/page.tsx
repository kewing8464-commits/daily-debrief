import { notFound, redirect } from 'next/navigation'
import { DayDetail } from '@/components/DayDetail'
import { TabBar } from '@/components/TabBar'
import { getUser } from '@/lib/supabase/server'

export default async function DayPage({ params }: PageProps<'/day/[date]'>) {
  const { date } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')
  const { data } = await supabase.from('days').select('*').eq('user_id', user.id).eq('day_date', date).maybeSingle()
  return (
    <main className="safe-top flex-1 px-4 pb-28">
      <DayDetail date={date} day={data?.status === 'saved' ? data : null} />
      <TabBar active="calendar" />
    </main>
  )
}
