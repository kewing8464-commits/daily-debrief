import { getUser } from '@/lib/supabase/server'
import { VibeCheckEditSchema } from '@/lib/vibe-checks'

const UUID = /^[0-9a-f-]{36}$/i

export async function PATCH(req: Request, ctx: RouteContext<'/api/vibe-checks/[id]'>) {
  const { id } = await ctx.params
  if (!UUID.test(id)) return Response.json({ error: 'Bad id' }, { status: 400 })
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const body = VibeCheckEditSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Write something first (up to 1,000 characters).' }, { status: 400 })
  const { data, error } = await supabase.from('vibe_checks').update(body.data).eq('id', id).eq('user_id', user.id).select().maybeSingle()
  if (error) return Response.json({ error: 'Could not save that. Try again.' }, { status: 500 })
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(data)
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/vibe-checks/[id]'>) {
  const { id } = await ctx.params
  if (!UUID.test(id)) return Response.json({ error: 'Bad id' }, { status: 400 })
  const { supabase, user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const { error } = await supabase.from('vibe_checks').delete().eq('id', id).eq('user_id', user.id)
  if (error) return Response.json({ error: 'Could not delete that. Try again.' }, { status: 500 })
  return Response.json({ deleted: true })
}
