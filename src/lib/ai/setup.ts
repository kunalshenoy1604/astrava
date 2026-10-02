import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { aiConfigFromEnv } from './client'
import { createEnricher, memoryCache, supabaseCache, type CachedEnrichment, type EnrichmentCache, type Enricher } from './enricher'
import { privilegedSql } from '@/lib/db/privileged'

/** Postgres-backed cache over the direct connection, for deployments without a service-role key. */
function sqlCache(): EnrichmentCache {
  return {
    async get(key) {
      const hit = await memoryCache.get(key)
      if (hit) return hit
      const sql = await privilegedSql()
      if (!sql) return null
      const rows = await sql<{ result: CachedEnrichment }[]>`select result from public.ai_enrichments where cache_key = ${key}`
      const value = rows[0]?.result ?? null
      if (value) await memoryCache.set(key, value, '')
      return value
    },
    async set(key, value, model) {
      await memoryCache.set(key, value, model)
      const sql = await privilegedSql()
      if (!sql) return
      await sql`insert into public.ai_enrichments (cache_key, model, result) values (${key}, ${model}, ${sql.json(value as never)})
                on conflict (cache_key) do update set result = excluded.result, model = excluded.model, created_at = now()`
    },
  }
}

/** Builds the AI enricher from environment variables, or undefined when no AI key is set. */
export function buildEnricherFromEnv(log?: (m: string) => void): Enricher | undefined {
  const config = aiConfigFromEnv()
  if (!config || config.maxPerRun === 0) return undefined
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  const cache =
    url && key
      ? supabaseCache(createClient(url, key, { auth: { persistSession: false } }))
      : process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_URL
        ? sqlCache()
        : memoryCache
  return createEnricher({ config, cache, githubToken: process.env.GITHUB_TOKEN, log })
}
