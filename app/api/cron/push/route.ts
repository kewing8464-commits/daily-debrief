import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { sendPush } from '@/lib/push'
import { reminderMessage } from '@/lib/reminders'

const Batch = z.object({
  batch: z.array(z.object({
    kind: z.enum(['nightly', 'followup']),
    name: z.string(),
    day: z.string(),
    started: z.boolean().nullable().transform((v) => !!v),
    notes: z.number(),
    subs: z.array(z.object({ endpoint: z.string(), p256dh: z.string(), auth: z.string() })),
  })).max(5000),
})

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Called every 15 minutes by the pg_cron job in Supabase with the list of people due a reminder.
 * Sends the pushes, then asks the database to forget devices that are gone.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret || !sameSecret(req.headers.get('x-cron-secret') ?? '', secret)) return Response.json({ error: 'Not allowed' }, { status: 401 })
  const body = Batch.safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Bad batch' }, { status: 400 })

  const gone: string[] = []
  let sent = 0
  await Promise.all(body.data.batch.flatMap((item) => {
    const message = reminderMessage(item)
    return item.subs.map(async (sub) => {
      const r = await sendPush(sub, message)
      if (r === 'ok') sent++
      if (r === 'gone') gone.push(sub.endpoint)
    })
  }))
  if (gone.length) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
    await db.rpc('forget_push_endpoints', { p_secret: secret, p_endpoints: gone })
  }
  return Response.json({ sent, gone: gone.length })
}
