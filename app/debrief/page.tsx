import { Debrief } from '@/components/Debrief'

// /debrief            -> tonight's debrief
// /debrief?date=...   -> catch up on a missed day (linked from the day view)
export default async function DebriefPage({ searchParams }: PageProps<'/debrief'>) {
  const { date } = await searchParams
  const requested = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined
  return <Debrief requestedDate={requested} />
}
