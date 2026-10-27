import { getUser } from '@/lib/supabase/server'

// Everything we store about the signed-in user, as one JSON download.
export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const [{ data: profile }, { data: days }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('days').select('*').eq('user_id', user.id).order('day_date'),
  ])
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), email: user.email, profile, days }, null, 2)
  return new Response(body, {
    headers: { 'content-type': 'application/json', 'content-disposition': 'attachment; filename="daily-debrief-export.json"' },
  })
}
