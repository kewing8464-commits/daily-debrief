import { z } from 'zod'
import { TurnSchema } from '@/lib/schemas'
import { DaySummarySchema } from '@/lib/summary'
import { getUser } from '@/lib/supabase/server'

const DATE = /^\d{4}-\d{2}-\d{2}$/

const Body = z.object({
  transcript: z.array(TurnSchema).max(400),
  summary: DaySummarySchema.nullable(),
  score: z.number().int().min(1).max(10).nullable(),
  mode: z.enum(['type', 'talk']),
  durationSec: z.number().int().min(0).max(24 * 3600),
  timezone: z.string().min(1).max(64),
  status: z.enum(['draft', 'saved']),
})

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
  // A background draft must never overwrite a day that is already saved.
  if (b.status === 'draft') {
    const { data: existing } = await supabase.from('days').select('status').eq('user_id', user.id).eq('day_date', date).maybeSingle()
    if (existing?.status === 'saved') return Response.json({ skipped: 'day already saved' }, { status: 409 })
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
