/**
 * Creates (or resets) a demo account with a finished profile, for showing the app to someone.
 * Run: npx tsx --env-file=.env.local scripts/create-demo.ts <email> <password> [name]
 * Then fill it with: scripts/seed-sample.ts <email> <from> <to>
 */
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

async function main() {
  const [email, password, name = 'Demo'] = process.argv.slice(2)
  if (!email || !password || password.length < 8) throw new Error('Usage: create-demo.ts <email> <password (8+)> [name]')
  const { data: list } = await admin.auth.admin.listUsers()
  let id = list.users.find((u) => u.email === email)?.id
  if (id) {
    const { error } = await admin.auth.admin.updateUserById(id, { password })
    if (error) throw error
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) throw error
    id = data.user.id
  }
  const { error } = await admin.from('profiles').upsert({ id, name, debrief_time: '21:30', timezone: 'America/Denver' })
  if (error) throw error
  console.log(`Demo account ready: ${email}`)
}

main().catch((e) => {
  console.error('DEMO FAILED:', e.message)
  process.exit(1)
})
