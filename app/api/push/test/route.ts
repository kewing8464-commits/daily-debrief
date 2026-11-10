import { z } from 'zod'
import { sendPush } from '@/lib/push'
import { getUser } from '@/lib/supabase/server'

const Body = z.object({ endpoint: z.string().max(1000) })

/** "Test it": send a sample reminder to this device right now. */
export async function POST(req: Request) {
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = Body.safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Bad request' }, { status: 400 })
  const { data: sub } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('endpoint', body.data.endpoint).eq('user_id', user.id).maybeSingle()
  if (!sub) return Response.json({ error: 'Reminders are not on for this device.' }, { status: 404 })
  const result = await sendPush(sub, { title: 'Daily Debrief', body: 'Test vibe check 🌙 Reminders are working.', url: '/', tag: 'test' })
  if (result === 'gone') {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint).eq('user_id', user.id)
    return Response.json({ error: 'This device stopped accepting reminders. Turn them on again.' }, { status: 410 })
  }
  if (result === 'error') return Response.json({ error: "Couldn't send the test. Try again in a minute." }, { status: 502 })
  return Response.json({ ok: true })
}
