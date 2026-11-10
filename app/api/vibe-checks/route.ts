import { debriefDateFor } from '@/lib/dates'
import { getUser } from '@/lib/supabase/server'
import { VibeCheckInputSchema } from '@/lib/vibe-checks'

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** A day's vibe checks (?date=), oldest first. */
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get('date') ?? ''
  if (!DATE.test(date)) return Response.json({ error: 'Bad date' }, { status: 400 })
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const { data, error } = await supabase.from('vibe_checks').select('*').eq('user_id', user.id).eq('day_date', date).order('created_at')
  if (error) return Response.json({ error: 'Could not load vibe checks.' }, { status: 500 })
  return Response.json(data)
}

/** Save a vibe check. It belongs to the debrief day in the person's time zone (before 4am counts as yesterday). */
export async function POST(req: Request) {
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = VibeCheckInputSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Write something first (up to 1,000 characters).' }, { status: 400 })
  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle()
  const { data, error } = await supabase
    .from('vibe_checks')
    .insert({ user_id: user.id, day_date: debriefDateFor(new Date(), profile?.timezone ?? 'UTC'), ...body.data })
    .select()
    .single()
  if (error) return Response.json({ error: 'Could not save that. Try again.' }, { status: 500 })
  return Response.json(data)
}
