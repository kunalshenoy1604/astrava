import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/server'
import { demoRepository } from './demo-repository'
import { liveRepository } from './live-repository'
import { MODERATION_TAG, SIGNALS_TAG } from './tags'
import { createSupabaseRepository } from './supabase-repository'
import type { ListOptions, SignalRepository } from './repository'
import type { SignalStatus } from '@/lib/domain/types'
import type { SignalSort } from '@/lib/domain/summary'

/**
 * Cached public reads. Results are shared across users, prerendered into
 * static shells, and invalidated by tag when the pipeline or an admin writes
 * (pipeline cron route and admin actions). Errors are not cached: callers
 * wrap these in `settle()` and render an inline error state.
 */
export { SIGNALS_TAG }

/**
 * Where signals come from:
 *  - DATA_SOURCE=database → rows written by the ingestion pipeline (needs Supabase + a scheduled pipeline)
 *  - DATA_SOURCE=demo     → the labelled fictional dataset
 *  - default (live)       → the pipeline run against public APIs, cached hourly
 * In every mode, reviewer moderation (hidden slugs) is applied on top when Supabase is configured.
 */
function baseRepo(): SignalRepository {
  const source = process.env.DATA_SOURCE ?? process.env.DATA_MODE
  if (source === 'demo') return demoRepository
  const client = createPublicClient()
  if (source === 'database' && client) return createSupabaseRepository(client)
  return liveRepository
}

async function hiddenSlugs(): Promise<Set<string>> {
  'use cache'
  cacheTag(SIGNALS_TAG, MODERATION_TAG)
  cacheLife('hours')
  const client = createPublicClient()
  if (!client) return new Set()
  const { data, error } = await client.from('signal_moderation').select('signal_slug').eq('hidden', true).limit(10_000)
  // Missing table (schema not migrated yet) must not take the site down.
  if (error) {
    console.error('[moderation]', error.message)
    return new Set()
  }
  return new Set(data.map((r) => r.signal_slug as string))
}

function repo(): SignalRepository {
  const base = baseRepo()
  const visible = async <T extends { slug: string }>(list: T[]) => {
    const hidden = await hiddenSlugs()
    return hidden.size ? list.filter((s) => !hidden.has(s.slug)) : list
  }
  return {
    mode: base.mode,
    listSignals: async (o) => visible(await base.listSignals(o)),
    getSignal: async (slug) => ((await hiddenSlugs()).has(slug) ? null : base.getSignal(slug)),
    getSummariesBySlugs: async (slugs) => visible(await base.getSummariesBySlugs(slugs)),
    listSlugs: async () => visible(await base.listSlugs()),
    search: async (q) => {
      const hidden = await hiddenSlugs()
      return (await base.search(q)).filter((r) => !hidden.has(r.href.split('/signals/')[1]?.split('#')[0] ?? ''))
    },
    status: () => base.status(),
  }
}

export async function getFeed(options: ListOptions = {}) {
  'use cache'
  cacheTag(SIGNALS_TAG)
  cacheLife('hours')
  return repo().listSignals(options)
}

export async function getSignalBySlug(slug: string) {
  'use cache'
  cacheTag(SIGNALS_TAG, `signal:${slug}`)
  cacheLife('hours')
  return repo().getSignal(slug)
}

export async function getSummaries(slugs: string[]) {
  'use cache'
  cacheTag(SIGNALS_TAG)
  cacheLife('hours')
  return repo().getSummariesBySlugs(slugs)
}

export async function getAllSlugs() {
  'use cache'
  cacheTag(SIGNALS_TAG)
  cacheLife('hours')
  return repo().listSlugs()
}

export async function getDatasetStatus() {
  'use cache'
  cacheTag(SIGNALS_TAG)
  cacheLife('hours')
  return repo().status()
}

/** Search is uncached per query string beyond a short window. */
export async function searchEverything(query: string) {
  'use cache'
  cacheTag(SIGNALS_TAG)
  cacheLife('minutes')
  return repo().search(query)
}

export async function getRelatedSignals(slug: string, topics: string[], limit = 4) {
  'use cache'
  cacheTag(SIGNALS_TAG)
  cacheLife('hours')
  const list = await repo().listSignals({ topics, limit: limit + 6 })
  return list.filter((s) => s.slug !== slug).slice(0, limit)
}

export type { ListOptions, SignalStatus, SignalSort }

export type Settled<T> = { ok: true; value: T } | { ok: false; error: string }

/** Converts a rejected data promise into a renderable error state. */
export async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await promise }
  } catch (err) {
    unstable_rethrow(err)
    console.error(err)
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
