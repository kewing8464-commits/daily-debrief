import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/manifest.webmanifest', '/icons', '/sw.js']

/** Refresh the session cookie, then send people where they belong:
 *  no session -> /login, session but no profile -> /setup. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p))
  const isApi = path.startsWith('/api')

  if (!data.user) {
    if (isPublic) return response
    if (isApi) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (path === '/login') return NextResponse.redirect(new URL('/', request.url))
  if (!isApi && path !== '/setup' && !isPublic) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle()
    if (!profile) return NextResponse.redirect(new URL('/setup', request.url))
  }
  return response
}
