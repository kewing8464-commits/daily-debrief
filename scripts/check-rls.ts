/**
 * Proves row-level security: user B can never read or change user A's days.
 * Run: npx tsx --env-file=.env.local scripts/check-rls.ts   (prints "RLS OK")
 * Creates two throwaway users and deletes them afterward (needs SUPABASE_SERVICE_ROLE_KEY).
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

async function makeUser(tag: string) {
  const email = `rls-${tag}-${Date.now()}@example.com`
  const password = `pw-${crypto.randomUUID()}`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  const client = createClient(url, anon, { auth: { persistSession: false } })
  const signIn = await client.auth.signInWithPassword({ email, password })
  if (signIn.error) throw signIn.error
  return { id: data.user.id, client }
}

async function main() {
  const a = await makeUser('a')
  const b = await makeUser('b')
  try {
    const ins = await a.client.from('days').insert({ user_id: a.id, day_date: '2026-10-27', timezone: 'UTC', score: 7 })
    if (ins.error) throw new Error('A could not write its own day: ' + ins.error.message)
    const own = await a.client.from('days').select('id').eq('user_id', a.id)
    if (own.data?.length !== 1) throw new Error('A cannot read its own day')
    const peek = await b.client.from('days').select('id').eq('user_id', a.id)
    if ((peek.data ?? []).length !== 0) throw new Error('B can read A\'s days')
    const upd = await b.client.from('days').update({ score: 1 }).eq('user_id', a.id).select('id')
    if ((upd.data ?? []).length !== 0) throw new Error('B can change A\'s days')
    const spoof = await b.client.from('days').insert({ user_id: a.id, day_date: '2026-10-28', timezone: 'UTC' })
    if (!spoof.error) throw new Error('B can write rows as A')
    console.log('RLS OK')
  } finally {
    await admin.auth.admin.deleteUser(a.id)
    await admin.auth.admin.deleteUser(b.id)
  }
}

main().catch((e) => {
  console.error('RLS FAILED:', e.message)
  process.exit(1)
})
