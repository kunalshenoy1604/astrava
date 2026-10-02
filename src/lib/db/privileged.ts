import 'server-only'
import postgres from 'postgres'
import { candidateUrls, describeUrl } from './connection'

type Sql = ReturnType<typeof postgres>
let cached: Promise<Sql | null> | null = null
let failedAt = 0
const RETRY_AFTER_MS = 10 * 60_000

async function open(): Promise<Sql | null> {
  for (const url of candidateUrls()) {
    const sql = postgres(url, { prepare: false, max: 2, idle_timeout: 20, ssl: 'require', connect_timeout: 6, onnotice: () => {} })
    try {
      await sql`select 1`
      return sql
    } catch (err) {
      console.warn(`[db] ${describeUrl(url)}: ${(err as Error).message}`)
      await sql.end({ timeout: 1 }).catch(() => {})
    }
  }
  return null
}

/** A privileged (owner) Postgres connection, or null when none is configured/reachable. Bypasses RLS: use only after authorisation. */
export async function privilegedSql(): Promise<Sql | null> {
  // After a failed attempt, don't re-scan every candidate on each call.
  if (!cached && Date.now() - failedAt < RETRY_AFTER_MS) return null
  cached ??= open().then((sql) => {
    if (!sql) {
      cached = null
      failedAt = Date.now()
    }
    return sql
  })
  return cached
}
