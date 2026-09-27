/**
 * Seeds topics and the clearly-labelled demo dataset into Supabase.
 * Usage: npm run seed            (topics + demo signals)
 *        npm run seed -- --topics-only
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from '@supabase/supabase-js'
import { DEMO_SIGNALS, TOPICS } from '../src/lib/demo'
import { computeBreakoutScore } from '../src/lib/scoring/model'
import { validateSignal } from '../src/lib/domain/validate'
import { SupabasePipelineStore } from '../src/lib/pipeline/store'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  const db = createClient(url, key, { auth: { persistSession: false } })

  // Parents first so the self-referencing FK is satisfied.
  const ordered = [...TOPICS].sort((a, b) => Number(Boolean(a.parent)) - Number(Boolean(b.parent)))
  const { error } = await db.from('topics').upsert(
    ordered.map((t, i) => ({ slug: t.slug, name: t.name, short_name: t.short, description: t.description, parent_slug: t.parent ?? null, sort_order: i })),
    { onConflict: 'slug' },
  )
  if (error) throw error
  console.log(`topics: ${TOPICS.length}`)
  if (process.argv.includes('--topics-only')) return

  const store = new SupabasePipelineStore(db)
  for (const signal of DEMO_SIGNALS) {
    const issues = validateSignal(signal)
    if (issues.length) throw new Error(`${signal.slug}: ${JSON.stringify(issues)}`)
    const score = computeBreakoutScore(signal)
    await store.saveSignal(signal, score)
    console.log(`${String(score.total).padStart(3)}  ${signal.slug}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
