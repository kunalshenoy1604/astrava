import 'server-only'
import postgres from 'postgres'
import { candidateUrls, describeUrl } from './connection'

type Sql = ReturnType<typeof postgres>
let cached: Promise<{ sql: Sql; host: string } | null> | null = null
let failedAt = 0
const RETRY_AFTER_MS = 10 * 60_000
const OVERALL_TIMEOUT_MS = 12_000

/**
 * Tries every candidate host in parallel and keeps the first that answers;
 * the others are closed. Wrong pooler regions reject quickly, so this settles
 * in roughly one round-trip instead of scanning sequentially.
 */
async function open(): Promise<{ sql: Sql; host: string } | null> {
  const urls = candidateUrls()
  if (urls.length === 0) return null
  const clients = urls.map((url) => ({
    url,
    sql: postgres(url, { prepare: false, max: 2, idle_timeout: 20, ssl: 'require', connect_timeout: 8, onnotice: () => {} }),
  }))
  const attempts = clients.map(({ url, sql }) => sql`select 1`.then(() => ({ sql, host: describeUrl(url) })))
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), OVERALL_TIMEOUT_MS))
  try {
    const winner = await Promise.race([Promise.any(attempts), timeout])
    for (const c of clients) if (c.sql !== winner.sql) void c.sql.end({ timeout: 1 }).catch(() => {})
    return winner
  } catch (err) {
    console.warn(`[db] no candidate connected: ${(err as Error).message}`)
    for (const c of clients) void c.sql.end({ timeout: 1 }).catch(() => {})
    return null
  }
}

async function connection() {
  // After a failed attempt, don't retry on every call.
  if (!cached && Date.now() - failedAt < RETRY_AFTER_MS) return null
  cached ??= open().then((c) => {
    if (!c) {
      cached = null
      failedAt = Date.now()
    }
    return c
  })
  return cached
}

/** A privileged (owner) Postgres connection, or null when none is configured/reachable. Bypasses RLS: use only after authorisation. */
export async function privilegedSql(): Promise<Sql | null> {
  return (await connection())?.sql ?? null
}

/** Host of the active privileged connection (no credentials), for the status page. */
export async function privilegedHost(): Promise<string | null> {
  return (await connection())?.host ?? null
}
