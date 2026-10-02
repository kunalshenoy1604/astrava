/**
 * Applies pending SQL migrations and seeds the topic taxonomy.
 * Runs automatically before `next build` (see package.json "prebuild"), so a
 * Supabase project connected through the Vercel integration is set up on the
 * next deploy with no manual SQL. Safe to run repeatedly.
 *
 * Connection: POSTGRES_URL_NON_POOLING, POSTGRES_URL or DATABASE_URL (set by
 * the Supabase ↔ Vercel integration). Without one, it exits quietly.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'
import { TOPICS } from '../src/lib/demo/topics'
import { candidateUrls, describeUrl } from '../src/lib/db/connection'

const DIR = join(process.cwd(), 'supabase/migrations')

async function connect() {
  for (const url of candidateUrls()) {
    const sql = postgres(url, { prepare: false, max: 1, ssl: url.includes('localhost') ? false : 'require', connect_timeout: 8, onnotice: () => {} })
    try {
      await sql`select 1`
      console.log(`[migrate] connected via ${describeUrl(url)}`)
      return sql
    } catch (err) {
      console.warn(`[migrate] could not connect via ${describeUrl(url)}: ${(err as Error).message}`)
      await sql.end({ timeout: 1 }).catch(() => {})
    }
  }
  return null
}

async function main() {
  const sql = await connect()
  if (!sql) {
    console.log('[migrate] no database connection configured or reachable; skipping.')
    return
  }
  try {
    await sql`create table if not exists public._astrava_migrations (name text primary key, applied_at timestamptz not null default now())`
    const applied = new Set((await sql<{ name: string }[]>`select name from public._astrava_migrations`).map((r) => r.name))
    for (const file of readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()) {
      if (applied.has(file)) continue
      console.log(`[migrate] applying ${file}`)
      await sql.begin(async (tx) => {
        await tx.unsafe(readFileSync(join(DIR, file), 'utf8'))
        await tx`insert into public._astrava_migrations (name) values (${file})`
      })
    }
    const ordered = [...TOPICS].sort((a, b) => Number(Boolean(a.parent)) - Number(Boolean(b.parent)))
    for (const [i, t] of ordered.entries()) {
      await sql`
        insert into public.topics (slug, name, short_name, description, parent_slug, sort_order)
        values (${t.slug}, ${t.name}, ${t.short}, ${t.description}, ${t.parent ?? null}, ${i})
        on conflict (slug) do update set name = excluded.name, short_name = excluded.short_name,
          description = excluded.description, parent_slug = excluded.parent_slug, sort_order = excluded.sort_order`
    }
    // The site owner (ADMIN_NOTIFICATION_EMAIL) becomes admin on sign-up, or now if already registered.
    const owner = process.env.ADMIN_NOTIFICATION_EMAIL?.trim().toLowerCase()
    if (owner) {
      await sql`insert into public.app_settings (key, value) values ('owner_email', ${owner}) on conflict (key) do update set value = excluded.value`
      await sql`update public.profiles set role = 'admin' where id in (select id from auth.users where lower(email) = ${owner})`
    }
    console.log(`[migrate] up to date; ${ordered.length} topics seeded.`)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error('[migrate] FAILED — the site will build, but accounts, saves and moderation need the schema:', err)
  // Do not fail the deploy: live signal pages work without the database.
  process.exit(process.env.MIGRATE_STRICT === '1' ? 1 : 0)
})
