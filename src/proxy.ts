import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Refreshes the Supabase session cookie on navigations and performs an
 * optimistic redirect for signed-out visitors to account-only routes.
 * Authorisation is enforced again on the server (getViewer / RLS); this
 * is not the security boundary.
 */
const PROTECTED = ['/account', '/admin']

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.next({ request })

  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
  const path = request.nextUrl.pathname
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))
  if (!hasSession && !isProtected) return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v)
      },
    },
  })

  // getClaims validates the JWT (and refreshes an expired session).
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)

  if (!signedIn && isProtected) {
    const to = request.nextUrl.clone()
    to.pathname = '/sign-in'
    to.search = `?next=${encodeURIComponent(path)}`
    return NextResponse.redirect(to)
  }
  return response
}

export const config = {
  // Everything except static assets, metadata files and the cron endpoint. Without a
  // Supabase session cookie the proxy returns immediately, so anonymous traffic is cheap.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|robots.txt|sitemap.xml|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)'],
}
