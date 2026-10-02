import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { privilegedSql } from '@/lib/db/privileged'
import type { ApplicationRow } from './queries'

const hasServiceKey = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)

/** Reads any application (after the caller has authorised via signed token or admin session). */
export async function readApplication(id: string): Promise<ApplicationRow | null> {
  if (hasServiceKey()) {
    const { data } = await createServiceClient().from('reviewer_applications').select('*').eq('id', id).maybeSingle()
    return (data as ApplicationRow | null) ?? null
  }
  const sql = await privilegedSql()
  if (!sql) throw new Error('No privileged database access configured (set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_DB_PASSWORD).')
  const rows = await sql<ApplicationRow[]>`select * from public.reviewer_applications where id = ${id}`
  return rows[0] ? { ...rows[0], created_at: new Date(rows[0].created_at).toISOString() } : null
}

/** Records a decision on a pending application and grants the reviewer role on approval. Atomic. */
export async function recordDecision(id: string, decision: 'approved' | 'rejected', note: string | null): Promise<'ok' | 'not-pending'> {
  if (hasServiceKey()) {
    const db = createServiceClient()
    const { data, error } = await db
      .from('reviewer_applications')
      .update({ status: decision, decision_note: note, decided_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
      .select('user_id')
    if (error) throw new Error(error.message)
    if (!data?.length) return 'not-pending'
    if (decision === 'approved') {
      const r = await db.from('profiles').update({ role: 'reviewer' }).eq('id', data[0]!.user_id).neq('role', 'admin')
      if (r.error) throw new Error(r.error.message)
    }
    return 'ok'
  }
  const sql = await privilegedSql()
  if (!sql) throw new Error('No privileged database access configured.')
  return sql.begin(async (tx) => {
    const rows = await tx<{ user_id: string }[]>`
      update public.reviewer_applications set status = ${decision}, decision_note = ${note}, decided_at = now()
      where id = ${id} and status = 'pending' returning user_id`
    if (!rows.length) return 'not-pending' as const
    if (decision === 'approved') await tx`update public.profiles set role = 'reviewer' where id = ${rows[0]!.user_id} and role <> 'admin'`
    return 'ok' as const
  })
}
