import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

// /api/mcp/ is reached by AI apps, not people: the connector link itself is the credential.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/mcp/).*)'],
}
