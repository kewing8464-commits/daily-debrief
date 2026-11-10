import { saveConflict } from '@/lib/days'
import { DayPutSchema } from '@/lib/schemas'
import { getUser } from '@/lib/supabase/server'

const DATE = /^\d{4}-\d{2}-\d{2}$/

const Body = DayPutSchema

export async function GET(_req: Request, ctx: RouteContext<'/api/days/[date]'>) {
  const { date } = await ctx.params
  if (!DATE.test(date)) return Response.json({ error: 'Bad date' }, { status: 400 })
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const { data, error } = await supabase.from('days').select('*').eq('user_id', user.id).eq('day_date', date).maybeSingle()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  // No debrief yet for this date is a normal answer, not an error.
  return Response.json(data ?? null)
}

export async function PUT(req: Request, ctx: RouteContext<'/api/days/[date]'>) {
  const { date } = await ctx.params
  if (!DATE.test(date)) return Response.json({ error: 'Bad date' }, { status: 400 })
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = Body.safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Bad request', issues: body.error.issues }, { status: 400 })
  const b = body.data
  if (b.status === 'saved' && (b.score === null || b.summary === null)) {
    return Response.json({ error: 'A saved day needs a score and a summary' }, { status: 400 })
  }
  // Never overwrite a saved day blindly: drafts never touch it, and saves must have seen its latest version.
  const { data: existing } = await supabase.from('days').select('status, updated_at').eq('user_id', user.id).eq('day_date', date).maybeSingle()
  if (saveConflict(existing, { status: b.status, expectedUpdatedAt: b.expectedUpdatedAt })) {
    return Response.json({ error: 'This day was saved from another screen. Reload to add to it.' }, { status: 409 })
  }
  const { data, error } = await supabase
    .from('days')
    .upsert(
      {
        user_id: user.id,
        day_date: date,
        transcript: b.transcript,
        summary: b.summary,
        score: b.score,
        productive: b.productive,
        focus: b.focus,
        from_memory: b.fromMemory,
        mode: b.mode,
        duration_sec: b.durationSec,
        timezone: b.timezone,
        status: b.status,
      },
      { onConflict: 'user_id,day_date' },
    )
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
