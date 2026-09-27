import 'server-only'
import { cookies } from 'next/headers'
import { TOPIC_BY_SLUG } from '@/lib/demo/topics'
import { createSessionClient } from '@/lib/supabase/server'
import type { Viewer } from '@/lib/auth/viewer'

/**
 * Personal state: radar topics and saved signals.
 *  - Signed in  → Postgres (user_topics, saved_signals) under RLS.
 *  - Signed out → first-party cookies on this browser. Merged into the
 *    account on sign-in (see mergeAnonymousState).
 */
export const RADAR_COOKIE = 'astrava_radar'
export const SAVED_COOKIE = 'astrava_saved'
export const MAX_SAVED = 100
const SLUG_RE = /^[a-z0-9-]{3,120}$/

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
}

export function parseTopicList(raw: string | undefined | null): string[] {
  if (!raw) return []
  return [...new Set(raw.split(',').filter((t) => TOPIC_BY_SLUG.has(t)))]
}

export function parseSlugList(raw: string | undefined | null): string[] {
  if (!raw) return []
  return [...new Set(raw.split(',').filter((s) => SLUG_RE.test(s)))].slice(0, MAX_SAVED)
}

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && SLUG_RE.test(slug)
}

export async function getRadarTopics(viewer: Viewer | null): Promise<string[]> {
  if (viewer) {
    const db = await createSessionClient()
    const { data, error } = await db!.from('user_topics').select('topic_slug').eq('user_id', viewer.id)
    if (error) throw new Error(error.message)
    return data.map((r) => r.topic_slug as string).filter((t) => TOPIC_BY_SLUG.has(t))
  }
  return parseTopicList((await cookies()).get(RADAR_COOKIE)?.value)
}

export async function getSavedSlugs(viewer: Viewer | null): Promise<string[]> {
  if (viewer) {
    const db = await createSessionClient()
    const { data, error } = await db!
      .from('saved_signals')
      .select('created_at, signals(slug)')
      .eq('user_id', viewer.id)
      .order('created_at', { ascending: false })
      .limit(MAX_SAVED)
    if (error) throw new Error(error.message)
    return (data as unknown as { signals: { slug: string } | null }[]).map((r) => r.signals?.slug).filter((s): s is string => Boolean(s))
  }
  return parseSlugList((await cookies()).get(SAVED_COOKIE)?.value)
}

/** Copies cookie-held radar and saves into the account, then clears the cookies. */
export async function mergeAnonymousState(userId: string): Promise<void> {
  const store = await cookies()
  const topics = parseTopicList(store.get(RADAR_COOKIE)?.value)
  const slugs = parseSlugList(store.get(SAVED_COOKIE)?.value)
  const db = await createSessionClient()
  if (!db) return
  if (topics.length) {
    await db.from('user_topics').upsert(
      topics.map((topic_slug) => ({ user_id: userId, topic_slug })),
      { onConflict: 'user_id,topic_slug', ignoreDuplicates: true },
    )
  }
  if (slugs.length) {
    const { data } = await db.from('signals').select('id').in('slug', slugs)
    if (data?.length) {
      await db.from('saved_signals').upsert(
        data.map((r) => ({ user_id: userId, signal_id: r.id as string })),
        { onConflict: 'user_id,signal_id', ignoreDuplicates: true },
      )
    }
  }
  store.delete(RADAR_COOKIE)
  store.delete(SAVED_COOKIE)
}
