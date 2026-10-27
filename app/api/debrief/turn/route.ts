import { z } from 'zod'
import { defaultModel } from '@/lib/ai/provider'
import { nextTurn, type ConversationState } from '@/lib/conversation'
import { ConversationStateSchema } from '@/lib/schemas'
import { getUser } from '@/lib/supabase/server'

const Body = z.object({ state: ConversationStateSchema, answer: z.string().max(4000), skip: z.boolean().optional() })

export async function POST(req: Request) {
  const { user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = Body.safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Bad request' }, { status: 400 })
  const result = await nextTurn(body.data.state as ConversationState, body.data.answer, defaultModel(), { skip: body.data.skip })
  return Response.json(result)
}
