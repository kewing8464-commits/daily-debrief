import { Debrief } from '@/components/Debrief'
import { getUser } from '@/lib/supabase/server'

// /debrief            -> tonight's debrief
// /debrief?date=...   -> catch up on a missed day (linked from the day view)
export default async function DebriefPage({ searchParams }: PageProps<'/debrief'>) {
  const { date } = await searchParams
  const requested = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined
  const { supabase, user } = await getUser()
  // select('*') so this still works before the ratings_on column exists
  const { data: profile } = user ? await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle() : { data: null }
  return <Debrief requestedDate={requested} ratingsOn={profile?.ratings_on ?? true} />
}
