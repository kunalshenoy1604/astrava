import 'server-only'
import { cacheLife } from 'next/cache'
import { OAUTH_PROVIDERS, getPublicSupabaseConfig, type OAuthProvider } from '@/lib/config'

/**
 * Social providers actually enabled in Supabase Auth, read from the project's
 * public settings endpoint. Enabling a provider in the Supabase dashboard makes
 * its button appear within minutes, no redeploy. NEXT_PUBLIC_AUTH_PROVIDERS,
 * when set, narrows and orders the list.
 */
export async function enabledProviders(): Promise<OAuthProvider[]> {
  'use cache'
  cacheLife('minutes')
  const config = getPublicSupabaseConfig()
  if (!config) return []
  let external: Record<string, boolean> = {}
  try {
    const res = await fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.key } })
    if (res.ok) external = ((await res.json()) as { external?: Record<string, boolean> }).external ?? {}
  } catch (err) {
    console.error('[auth] could not read provider settings', (err as Error).message)
  }
  const enabled = (Object.keys(OAUTH_PROVIDERS) as OAuthProvider[]).filter((p) => external[p] === true)
  const order = process.env.NEXT_PUBLIC_AUTH_PROVIDERS?.split(',').map((s) => s.trim()).filter(Boolean)
  return order?.length ? order.filter((p): p is OAuthProvider => enabled.includes(p as OAuthProvider)) : enabled
}
