/**
 * Proves the connector only ever returns the link owner's saved days, and that
 * a revoked link stops working at once.
 * Run: npx tsx --env-file=.env.local scripts/check-connector.ts   (prints "CONNECTOR OK")
 * Creates two throwaway users and deletes them afterward (needs SUPABASE_SERVICE_ROLE_KEY).
 */
import { createClient } from '@supabase/supabase-js'
import { hashToken, newConnectorToken } from '../lib/connector/token'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

async function makeUser(tag: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `conn-${tag}-${Date.now()}@example.com`, password: `pw-${crypto.randomUUID()}`, email_confirm: true,
  })
  if (error) throw error
  const id = data.user.id
  const p = await admin.from('profiles').insert({ id, name: tag, debrief_time: '21:30', timezone: 'America/Denver' })
  if (p.error) throw p.error
  return id
}

async function days(token: string) {
  const { data, error } = await anon.rpc('connector_days', { p_token: token, p_from: '2026-01-01', p_to: '2026-12-31' })
  if (error) throw new Error('connector_days failed: ' + error.message)
  return data as { user_id: string; day_date: string }[]
}

async function main() {
  const a = await makeUser('a')
  const b = await makeUser('b')
  try {
    const ins = await admin.from('days').insert([
      { user_id: a, day_date: '2026-10-20', timezone: 'UTC', score: 8, status: 'saved' },
      { user_id: a, day_date: '2026-10-21', timezone: 'UTC', status: 'draft' },
      { user_id: b, day_date: '2026-10-20', timezone: 'UTC', score: 3, status: 'saved' },
    ])
    if (ins.error) throw ins.error
    const token = newConnectorToken()
    const t = await admin.from('connector_tokens').insert({ user_id: a, token_hash: hashToken(token) })
    if (t.error) throw t.error

    const prof = await anon.rpc('connector_profile', { p_token: token })
    if (prof.error || prof.data?.[0]?.name !== 'a') throw new Error('profile lookup failed')
    const got = await days(token)
    if (got.length !== 1 || got[0].user_id !== a || got[0].day_date !== '2026-10-20') {
      throw new Error('expected only A\'s one saved day, got ' + JSON.stringify(got.map((d) => [d.user_id === a ? 'A' : 'B', d.day_date])))
    }
    if ((await days(newConnectorToken())).length !== 0) throw new Error('unknown token returned days')
    const unknownProf = await anon.rpc('connector_profile', { p_token: 'nope' })
    if ((unknownProf.data ?? []).length !== 0) throw new Error('unknown token returned a profile')
    const peek = await anon.from('connector_tokens').select('*')
    if ((peek.data ?? []).length !== 0) throw new Error('anon can read connector_tokens')

    await admin.from('connector_tokens').delete().eq('user_id', a)
    if ((await days(token)).length !== 0) throw new Error('revoked token still works')
    console.log('CONNECTOR OK')
  } finally {
    await admin.auth.admin.deleteUser(a)
    await admin.auth.admin.deleteUser(b)
  }
}

main().catch((e) => {
  console.error('CONNECTOR FAILED:', e.message)
  process.exit(1)
})
