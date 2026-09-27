import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getPublicSupabaseConfig } from '@/lib/config'

/**
 * Request-scoped client that carries the user's session (reads cookies).
 * Use for anything personal or privileged: RLS applies as the signed-in user.
 * Returns null when Supabase is not configured (demo mode).
 */
export async function createSessionClient(): Promise<SupabaseClient | null> {
  const config = getPublicSupabaseConfig()
  if (!config) return null
  const cookieStore = await cookies()
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Called from a Server Component where cookies are read-only; the proxy refreshes sessions.
        }
      },
    },
  })
}

/**
 * Cookie-less client for public, cacheable reads. Runs as the anon role, so
 * RLS limits it to visible signals and public tables.
 */
export function createPublicClient(): SupabaseClient | null {
  const config = getPublicSupabaseConfig()
  if (!config) return null
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
