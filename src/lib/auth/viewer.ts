import 'server-only'
import { cache } from 'react'
import { createSessionClient } from '@/lib/supabase/server'

export interface Viewer {
  id: string
  email: string | null
  displayName: string | null
  role: 'member' | 'admin'
}

/**
 * The signed-in user, verified against Supabase Auth (getUser performs a
 * server round-trip, unlike reading the JWT alone). Memoised per request.
 * Returns null when signed out or when Supabase is not configured.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createSessionClient()
  if (!supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  const { data: profile } = await supabase.from('profiles').select('display_name, role').eq('id', data.user.id).maybeSingle()
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    displayName: (profile?.display_name as string | null) ?? null,
    role: profile?.role === 'admin' ? 'admin' : 'member',
  }
})

export async function requireAdmin(): Promise<Viewer | null> {
  const viewer = await getViewer()
  return viewer?.role === 'admin' ? viewer : null
}
