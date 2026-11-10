import { z } from 'zod'
import { getUser } from '@/lib/supabase/server'

const Sub = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  label: z.string().max(60).optional(),
})
const Toggle = z.object({ endpoint: z.string().max(1000), reminder_on: z.boolean().optional(), followup_on: z.boolean().optional() })
const Gone = z.object({ endpoint: z.string().max(1000) })

/** This person's devices with reminders on. */
export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const { data } = await supabase.from('push_subscriptions').select('endpoint, device_label, reminder_on, followup_on, last_seen_at').eq('user_id', user.id)
  return Response.json(data ?? [])
}

/** Turn reminders on for this device (or refresh its address). */
export async function POST(req: Request) {
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = Sub.safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Bad subscription' }, { status: 400 })
  const { endpoint, keys, label } = body.data
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, device_label: label ?? null, last_seen_at: new Date().toISOString() },
    { onConflict: 'endpoint' },
  )
  if (error) return Response.json({ error: 'Could not turn reminders on. Try again.' }, { status: 500 })
  return Response.json({ ok: true })
}

/** Switch the nightly reminder or the follow-up on or off for this device. */
export async function PATCH(req: Request) {
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = Toggle.safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Bad request' }, { status: 400 })
  const { endpoint, ...changes } = body.data
  const { error } = await supabase.from('push_subscriptions').update(changes).eq('endpoint', endpoint).eq('user_id', user.id)
  if (error) return Response.json({ error: 'Could not save that. Try again.' }, { status: 500 })
  return Response.json({ ok: true })
}

/** Turn reminders off for this device. */
export async function DELETE(req: Request) {
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = Gone.safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Bad request' }, { status: 400 })
  await supabase.from('push_subscriptions').delete().eq('endpoint', body.data.endpoint).eq('user_id', user.id)
  return Response.json({ ok: true })
}
