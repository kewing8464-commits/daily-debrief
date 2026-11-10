import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

// /api/mcp/ is reached by AI apps (the link is the credential) and /api/cron/ by the Supabase scheduler (secret header), not people.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/mcp/|api/cron/).*)'],
}
