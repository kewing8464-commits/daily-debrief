import { z } from 'zod'
import { defaultModel } from '@/lib/ai/provider'
import { nextScriptedQuestion, startConversation } from '@/lib/conversation'
import { getUser } from '@/lib/supabase/server'
import { startFromVibeChecks, type VibeCheck } from '@/lib/vibe-checks'

const Body = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })

/** Open a fresh debrief: from the day's vibe checks if there are any, otherwise from the first question. */
export async function POST(req: Request) {
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = Body.safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Bad request' }, { status: 400 })
  const [{ data: checks }, { data: profile }] = await Promise.all([
    supabase.from('vibe_checks').select('*').eq('user_id', user.id).eq('day_date', body.data.date).order('created_at'),
    supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
  ])
  if (!checks?.length) {
    const state = startConversation()
    return Response.json({ state, next: nextScriptedQuestion(state), usedAi: false, notes: 0 })
  }
  const r = await startFromVibeChecks(checks as VibeCheck[], profile?.timezone ?? 'UTC', defaultModel())
  return Response.json({ ...r, notes: checks.length })
}
