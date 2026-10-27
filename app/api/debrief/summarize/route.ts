import { z } from 'zod'
import { defaultModel } from '@/lib/ai/provider'
import type { Turn } from '@/lib/conversation'
import { TurnSchema } from '@/lib/schemas'
import { summarizeTranscript } from '@/lib/summary'
import { getUser } from '@/lib/supabase/server'

const Body = z.object({ turns: z.array(TurnSchema).max(400), score: z.number().int().min(1).max(10) })

export async function POST(req: Request) {
  const { user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = Body.safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Bad request' }, { status: 400 })
  return Response.json(await summarizeTranscript(body.data.turns as Turn[], body.data.score, defaultModel()))
}
