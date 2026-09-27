'use server'

import { cookies } from 'next/headers'
import { refresh } from 'next/cache'
import { z } from 'zod'
import { getViewer } from '@/lib/auth/viewer'
import { createSessionClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { TOPIC_BY_SLUG } from '@/lib/demo/topics'
import { MAX_SAVED, RADAR_COOKIE, SAVED_COOKIE, cookieOptions, isValidSlug, parseSlugList } from './store'

export interface ActionResult {
  ok: boolean
  message?: string
}

const topicsSchema = z.array(z.string().refine((t) => TOPIC_BY_SLUG.has(t), 'Unknown topic')).max(TOPIC_BY_SLUG.size)

/** Replaces the radar with the submitted set of topics. */
export async function saveRadarAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const limited = await rateLimit('personal')
  if (!limited.allowed) return { ok: false, message: 'Too many changes. Try again in a minute.' }

  const parsed = topicsSchema.safeParse(formData.getAll('topic').map(String))
  if (!parsed.success) return { ok: false, message: 'One of the selected topics is not recognised.' }
  const topics = [...new Set(parsed.data)]

  const viewer = await getViewer()
  if (viewer) {
    const db = (await createSessionClient())!
    const del = await db.from('user_topics').delete().eq('user_id', viewer.id)
    if (del.error) return { ok: false, message: 'Could not update your radar. Please retry.' }
    if (topics.length) {
      const ins = await db.from('user_topics').insert(topics.map((topic_slug) => ({ user_id: viewer.id, topic_slug })))
      if (ins.error) return { ok: false, message: 'Could not update your radar. Please retry.' }
    }
  } else {
    const store = await cookies()
    if (topics.length) store.set(RADAR_COOKIE, topics.join(','), cookieOptions)
    else store.delete(RADAR_COOKIE)
  }
  refresh()
  return { ok: true, message: topics.length ? `Radar saved · ${topics.length} topic${topics.length === 1 ? '' : 's'}` : 'Radar cleared' }
}

/** Saves or unsaves one signal. `intent` is explicit so double-submits are idempotent. */
export async function toggleSavedAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const limited = await rateLimit('personal')
  if (!limited.allowed) return { ok: false, message: 'Too many changes. Try again in a minute.' }

  const slug = formData.get('slug')
  const intent = formData.get('intent')
  if (!isValidSlug(slug) || (intent !== 'save' && intent !== 'unsave')) return { ok: false, message: 'Invalid request.' }

  const viewer = await getViewer()
  if (viewer) {
    const db = (await createSessionClient())!
    const { data: signal } = await db.from('signals').select('id').eq('slug', slug).maybeSingle()
    if (!signal) return { ok: false, message: 'Signal not found.' }
    const res =
      intent === 'save'
        ? await db.from('saved_signals').upsert({ user_id: viewer.id, signal_id: signal.id }, { onConflict: 'user_id,signal_id', ignoreDuplicates: true })
        : await db.from('saved_signals').delete().eq('user_id', viewer.id).eq('signal_id', signal.id)
    if (res.error) return { ok: false, message: 'Could not update saved signals.' }
  } else {
    const store = await cookies()
    const current = parseSlugList(store.get(SAVED_COOKIE)?.value).filter((s) => s !== slug)
    const next = intent === 'save' ? [slug, ...current].slice(0, MAX_SAVED) : current
    if (next.length) store.set(SAVED_COOKIE, next.join(','), cookieOptions)
    else store.delete(SAVED_COOKIE)
  }
  refresh()
  return { ok: true, message: intent === 'save' ? 'Saved' : 'Removed' }
}
