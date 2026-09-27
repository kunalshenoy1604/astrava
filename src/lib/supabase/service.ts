import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role client. Bypasses RLS. Only for the ingestion pipeline and seed
 * scripts running on the server. The key is read from a non-public env var,
 * and this module imports 'server-only' so bundling it into client code fails
 * the build.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) and NEXT_PUBLIC_SUPABASE_URL are required.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
