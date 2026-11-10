import { createMcpHandler } from 'mcp-handler'
import { supabaseSource } from '@/lib/connector/source'
import { registerJournalTools } from '@/lib/connector/tools'

const TOKEN = /^[A-Za-z0-9_-]{43}$/
const unknown = () => Response.json({ error: 'Unknown connector link' }, { status: 404 })

// The Daily Debrief connector: an MCP server an AI app (Claude, ChatGPT, ...) talks to.
// The secret in the URL picks the journal; revoked or made-up links get a 404.
async function handle(request: Request, ctx: RouteContext<'/api/mcp/[token]'>) {
  const { token } = await ctx.params
  if (!TOKEN.test(token)) return unknown()
  const source = supabaseSource(token)
  const profile = await source.profile()
  if (!profile) return unknown()
  const handler = createMcpHandler(
    (server) => registerJournalTools(server, { ...source, profile: async () => profile }, () => new Date()),
    // maxSubscriptions 0: AI apps only call tools here; don't hold a streaming connection open until the 300s timeout.
    { serverInfo: { name: 'daily-debrief', version: '1.0.0' }, maxSubscriptions: 0 },
  )
  return handler(request)
}

export { handle as GET, handle as POST, handle as DELETE }
