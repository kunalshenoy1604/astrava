import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/server'
import { demoRepository } from './demo-repository'
import { liveRepository } from './live-repository'
import { SIGNALS_TAG } from './tags'
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

function repo(): SignalRepository {
  const client = createPublicClient()
  if (client) return createSupabaseRepository(client)
  // Without a database: live data from public APIs, unless DATA_MODE=demo is set explicitly.
  return process.env.DATA_MODE === 'demo' ? demoRepository : liveRepository
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
