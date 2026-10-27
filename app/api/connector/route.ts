import { hashToken, newConnectorToken } from '@/lib/connector/token'
import { getUser } from '@/lib/supabase/server'

const signedOut = () => Response.json({ error: 'Not signed in' }, { status: 401 })
const failed = () => Response.json({ error: 'Something went wrong, try again.' }, { status: 500 })

/** Is a connector link set up, and when was it last used? */
export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return signedOut()
  const { data, error } = await supabase.from('connector_tokens').select('created_at, last_used_at').eq('user_id', user.id).maybeSingle()
  if (error) return failed()
  return Response.json(data ? { connected: true, createdAt: data.created_at, lastUsedAt: data.last_used_at } : { connected: false })
}

/** Create a new link, replacing any old one. The link is returned this once and never again. */
export async function POST(request: Request) {
  const { supabase, user } = await getUser()
  if (!user) return signedOut()
  const token = newConnectorToken()
  const { error } = await supabase.from('connector_tokens').upsert(
    { user_id: user.id, token_hash: hashToken(token), created_at: new Date().toISOString(), last_used_at: null },
    { onConflict: 'user_id' },
  )
  if (error) return failed()
  return Response.json({ url: `${new URL(request.url).origin}/api/mcp/${token}` })
}

/** Revoke: the link stops working right away. */
export async function DELETE() {
  const { supabase, user } = await getUser()
  if (!user) return signedOut()
  const { error } = await supabase.from('connector_tokens').delete().eq('user_id', user.id)
  if (error) return failed()
  return Response.json({ connected: false })
}
