import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { BreakoutScore, Signal } from '@/lib/domain/types'
import type { PipelineStats } from '@/lib/pipeline/types'
import { runPipeline } from '@/lib/pipeline/run'
import { enabledAdapters } from '@/lib/pipeline/sources'
import { MemoryPipelineStore } from '@/lib/pipeline/store'
import { pipelineEnvFromProcess } from '@/lib/pipeline/env'
import { buildEnricherFromEnv } from '@/lib/ai/setup'
import { createMemoryRepository, indexSignals, type Indexed } from './memory-repository'
import { demoRepository } from './demo-repository'
import { SIGNALS_TAG } from './tags'
import type { SignalRepository } from './repository'

/**
 * Live mode without a database: the ingestion pipeline runs against the
 * public source APIs and its output is cached for an hour, then recomputed.
 * Everything shown is real, sourced data. Without stored history, momentum
 * uses only series the sources return directly (npm daily downloads,
 * Hacker News points by date); connect Supabase to accumulate history.
 */
export interface LiveSnapshot {
  generatedAt: string
  entries: { signal: Signal; score: BreakoutScore }[]
  stats: PipelineStats
}

const LOOKBACK_HOURS = 72

// De-duplicates concurrent cold-cache calls within one server instance (e.g. during a build).
let inflight: { key: number; promise: Promise<LiveSnapshot> } | null = null

async function computeSnapshot(): Promise<LiveSnapshot> {
  const now = new Date()
  const env = pipelineEnvFromProcess()
  const store = new MemoryPipelineStore()
  const result = await runPipeline({
    adapters: enabledAdapters(env),
    store,
    env,
    now,
    lookbackHours: LOOKBACK_HOURS,
    enrich: buildEnricherFromEnv((m) => console.log(`[live] ${m}`)),
    log: (m) => console.log(`[live] ${m}`),
  })
  return { generatedAt: now.toISOString(), entries: [...store.signals.values()], stats: result.stats }
}

/**
 * Never rejects: a failed run returns an empty snapshot, which is cached only
 * for minutes (so the next attempt comes soon) while the site falls back to the
 * labelled demo dataset. A successful run is cached for an hour.
 */
export async function loadLiveSnapshot(): Promise<LiveSnapshot> {
  'use cache'
  cacheTag(SIGNALS_TAG)
  const key = Math.floor(Date.now() / 600_000)
  if (!inflight || inflight.key !== key) inflight = { key, promise: computeSnapshot() }
  let snap: LiveSnapshot
  try {
    snap = await inflight.promise
  } catch (err) {
    inflight = null
    snap = { generatedAt: new Date().toISOString(), entries: [], stats: { fetched: {}, errors: { pipeline: (err as Error).message }, normalized: 0, duplicates: 0, clusters: 0, candidates: 0, stored: 0, skippedBelowThreshold: 0 } }
  }
  if (snap.entries.length === 0) {
    inflight = null
    cacheLife('minutes')
  } else {
    cacheLife('hours')
  }
  return snap
}

let lastIndex: { at: string; index: Map<string, Indexed> } | null = null

class NoLiveData extends Error {}

async function loadIndex(): Promise<Map<string, Indexed>> {
  const snap = await loadLiveSnapshot()
  if (snap.entries.length === 0) throw new NoLiveData(JSON.stringify(snap.stats.errors))
  if (lastIndex?.at !== snap.generatedAt) lastIndex = { at: snap.generatedAt, index: indexSignals(snap.entries) }
  return lastIndex.index
}

const live = createMemoryRepository('live', loadIndex, (idx) => ({
  mode: 'live',
  signalCount: idx.size,
  lastUpdated: lastIndex?.at ?? null,
  lastPipelineRun: null,
}))

/** Falls back to the labelled demo dataset (and says so) only when every live source fails. */
async function withFallback<T>(fn: (r: SignalRepository) => Promise<T>): Promise<T> {
  try {
    return await fn(live)
  } catch (err) {
    console.error('[live] falling back to demo dataset:', (err as Error).message)
    return fn(demoRepository)
  }
}

export const liveRepository: SignalRepository = {
  mode: 'live',
  listSignals: (o) => withFallback((r) => r.listSignals(o)),
  getSignal: (s) => withFallback((r) => r.getSignal(s)),
  getSummariesBySlugs: (s) => withFallback((r) => r.getSummariesBySlugs(s)),
  listSlugs: () => withFallback((r) => r.listSlugs()),
  search: (q) => withFallback((r) => r.search(q)),
  status: () =>
    withFallback(async (r) => {
      const s = await r.status()
      if (r !== live) return { ...s, note: 'Live sources are unavailable right now; showing the labelled demo dataset.' }
      const snap = await loadLiveSnapshot()
      return { ...s, lastUpdated: snap.generatedAt, sources: snap.stats.fetched, sourceErrors: Object.keys(snap.stats.errors) }
    }),
}
