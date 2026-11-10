/**
 * Proves who gets a reminder and when. Creates a throwaway user (debrief 9:30 pm, Denver)
 * with a fake device, asks reminder_batch() at set times, then deletes the user.
 * Run: npx tsx --env-file=.env.local scripts/check-reminders.ts   (prints "REMINDERS OK")
 */
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
type Item = { kind: string; name: string; day: string; started: boolean | null; notes: number; subs: unknown[] }

// Nov 10, 2026 in Denver is UTC-7: 9:31 pm local = 04:31 UTC on Nov 11.
const at = (local: string, utcDate = '2026-11-11') => `${utcDate}T${local}:00Z`

async function batch(when: string, id: string): Promise<Item | undefined> {
  const { data, error } = await admin.rpc('reminder_batch', { p_now: when })
  if (error) throw new Error('reminder_batch failed: ' + error.message)
  return (data as (Item & { name: string })[]).find((x) => x.name === id)
}

async function main() {
  const name = `rem-${Date.now()}`
  const { data, error } = await admin.auth.admin.createUser({ email: `${name}@example.com`, password: `pw-${crypto.randomUUID()}`, email_confirm: true })
  if (error) throw error
  const id = data.user.id
  try {
    await admin.from('profiles').insert({ id, name, debrief_time: '21:30', timezone: 'America/Denver' })
    await admin.from('push_subscriptions').insert({ user_id: id, endpoint: `https://push.example.com/${name}`, p256dh: 'x', auth: 'y' })
    await admin.from('vibe_checks').insert({ user_id: id, day_date: '2026-11-10', text: 'note' })

    if (await batch(at('04:20'), name)) throw new Error('reminded before debrief time (9:20 pm)')
    const nightly = await batch(at('04:31'), name)
    if (nightly?.kind !== 'nightly' || nightly.day !== '2026-11-10' || nightly.notes !== 1 || nightly.subs.length !== 1) throw new Error('no nightly reminder at 9:31 pm: ' + JSON.stringify(nightly))
    if (await batch(at('04:35'), name)) throw new Error('sent the nightly reminder twice')
    if (await batch(at('04:50'), name)) throw new Error('follow-up too early (9:50 pm)')
    const follow = await batch(at('05:35'), name)
    if (follow?.kind !== 'followup') throw new Error('no follow-up at 10:35 pm')
    if (await batch(at('05:40'), name)) throw new Error('sent the follow-up twice')

    // Next night: debriefed before the reminder time, so nothing is sent.
    await admin.from('days').insert({ user_id: id, day_date: '2026-11-11', timezone: 'America/Denver', status: 'saved', score: 7 })
    if (await batch(at('04:31', '2026-11-12'), name)) throw new Error('reminded someone who already debriefed')
    // Paused: nothing either.
    await admin.from('profiles').update({ reminders_paused_until: '2026-11-12' }).eq('id', id)
    if (await batch(at('04:31', '2026-11-13'), name)) throw new Error('reminded while paused')
    console.log('REMINDERS OK')
  } finally {
    await admin.auth.admin.deleteUser(id)
  }
}

main().catch((e) => {
  console.error('REMINDERS FAILED:', e.message)
  process.exit(1)
})
