import 'server-only'
import { createSessionClient, createPublicClient } from '@/lib/supabase/server'
import { readApplication } from './privileged'
import { verifyDecisionToken } from './token'

export interface ApplicationRow {
  id: string
  user_id: string
  email: string
  full_name: string
  profile_links: string[]
  expertise: string[]
  motivation: string
  experience: string
  sample_signal_slug: string | null
  sample_review: string
  conflicts: string
  hours_per_week: number
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  decision_note: string | null
  decided_at: string | null
  created_at: string
}

export async function myLatestApplication(userId: string): Promise<ApplicationRow | null> {
  const db = await createSessionClient()
  if (!db) return null
  const { data } = await db.from('reviewer_applications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
  return (data?.[0] as ApplicationRow | undefined) ?? null
}

export async function applicationForToken(token: string | undefined): Promise<ApplicationRow | null> {
  const verified = verifyDecisionToken(token)
  if (!verified) return null
  return readApplication(verified.applicationId)
}

export async function allApplications(): Promise<ApplicationRow[]> {
  const db = (await createSessionClient())!
  const { data, error } = await db.from('reviewer_applications').select('*').order('created_at', { ascending: false }).limit(200)
  if (error) throw new Error(error.message)
  return data as ApplicationRow[]
}

export interface ModerationEntry {
  id: number
  signal_slug: string
  signal_title: string | null
  action: 'hide' | 'restore'
  reason: string
  actor_name: string | null
  created_at: string
}

export async function moderationLog(limit = 200): Promise<{ entries: ModerationEntry[]; hidden: Set<string> } | null> {
  const db = createPublicClient()
  if (!db) return null
  const [log, state] = await Promise.all([
    db.from('moderation_log').select('*').order('created_at', { ascending: false }).limit(limit),
    db.from('signal_moderation').select('signal_slug').eq('hidden', true),
  ])
  if (log.error) throw new Error(log.error.message)
  return { entries: log.data as ModerationEntry[], hidden: new Set((state.data ?? []).map((r) => r.signal_slug as string)) }
}
