import { NextResponse, type NextRequest } from 'next/server'
import { createSessionClient } from '@/lib/supabase/server'
import { mergeAnonymousState } from '@/lib/personal/store'
import { safeRedirectPath } from '@/lib/security/url'

/** OAuth (PKCE) callback: exchanges the code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'), '/radar')
  const supabase = await createSessionClient()
  if (code && supabase) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      await mergeAnonymousState(data.user.id)
      return NextResponse.redirect(new URL(next, origin))
    }
  }
  return NextResponse.redirect(new URL('/sign-in?error=callback', origin))
}
