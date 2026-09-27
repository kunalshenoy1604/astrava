/**
 * CLI entry: `npm run pipeline` (writes to Supabase) or
 * `npm run pipeline -- --dry-run` (in-memory store, prints what would be stored).
 * After a real run, call the site's revalidation by hitting /api/cron/ingest, or
 * rely on the hourly cache lifetime.
 */
import { runPipeline } from '../src/lib/pipeline/run'
import { enabledAdapters } from '../src/lib/pipeline/sources'
import { MemoryPipelineStore, SupabasePipelineStore } from '../src/lib/pipeline/store'
import { pipelineEnvFromProcess } from '../src/lib/pipeline/env'
import { createClient } from '@supabase/supabase-js'

const dryRun = process.argv.includes('--dry-run')
const env = pipelineEnvFromProcess()

async function main() {
  let store
  if (dryRun) {
    store = new MemoryPipelineStore()
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
    if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --dry-run.')
    store = new SupabasePipelineStore(createClient(url, key, { auth: { persistSession: false } }))
  }
  const adapters = enabledAdapters(env)
  console.log(`Sources: ${adapters.map((a) => a.id).join(', ')}${dryRun ? ' (dry run)' : ''}`)
  const result = await runPipeline({ adapters, store, env })
  console.log(JSON.stringify(result.stats, null, 2))
  if (dryRun && store instanceof MemoryPipelineStore) {
    for (const { signal, score } of store.signals.values()) console.log(`${String(score.total).padStart(3)}  ${signal.primaryTopic.padEnd(24)} ${signal.title}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
