/**
 * Pipeline orchestration. Designed to run roughly hourly from a cron trigger
 * (Vercel Cron → /api/cron/ingest, GitHub Actions, or `npm run pipeline`).
 * The frontend never polls; it reads stored results and is revalidated by tag.
 */
import type { MetricSeries } from '@/lib/domain/types'
import type { FetchContext, Metric, NormalizedEvent, PipelineEnv, PipelineStats, RawEvent, SourceAdapter } from './types'
import type { PipelineStore } from './store'
import { buildSeries, dedupe, isCandidate, isRelevant, resolveEntities } from './stages'
import { extractSignal, mergeWithExisting, signalSlugFor } from './extract'
import { computeBreakoutScore, momentumRatio } from '@/lib/scoring/model'
import { validateSignal } from '@/lib/domain/validate'

export interface RunOptions {
  adapters: SourceAdapter[]
  store: PipelineStore
  env: PipelineEnv
  now?: Date
  /** How far back each source is asked for new items. */
  lookbackHours?: number
  fetchImpl?: typeof fetch
  log?: (msg: string) => void
  newId?: () => string
}

export interface RunResult {
  runId: string
  status: 'succeeded' | 'failed' | 'partial'
  stats: PipelineStats
  storedSlugs: string[]
}

const HISTORY_DAYS = 70

export async function runPipeline(opts: RunOptions): Promise<RunResult> {
  const now = opts.now ?? new Date()
  const log = opts.log ?? ((m: string) => console.log(`[pipeline] ${m}`))
  const stats: PipelineStats = {
    fetched: {},
    errors: {},
    normalized: 0,
    duplicates: 0,
    clusters: 0,
    candidates: 0,
    stored: 0,
    skippedBelowThreshold: 0,
  }
  const runId = await opts.store.startRun()
  const storedSlugs: string[] = []

  try {
    // 1. Fetch (each source isolated: one failing API never blocks the others)
    const ctx: FetchContext = {
      now,
      since: new Date(now.getTime() - (opts.lookbackHours ?? 48) * 3600_000),
      env: opts.env,
      fetch: opts.fetchImpl ?? fetch,
      log,
    }
    const raws: [SourceAdapter, RawEvent][] = []
    for (const adapter of opts.adapters) {
      try {
        const items = await adapter.fetch(ctx)
        stats.fetched[adapter.id] = items.length
        for (const item of items) raws.push([adapter, item])
      } catch (err) {
        stats.errors[adapter.id] = (err as Error).message
        log(`${adapter.id} failed: ${(err as Error).message}`)
      }
    }

    // 2. Normalize
    const rawByKey = new Map<string, unknown>()
    const normalized: NormalizedEvent[] = []
    for (const [adapter, raw] of raws) {
      const n = adapter.normalize(raw)
      if (!n) continue
      rawByKey.set(n.dedupeKey, raw.payload)
      normalized.push(n)
    }
    stats.normalized = normalized.length

    // 3. Deduplicate against storage and within the batch
    const known = await opts.store.knownDedupeKeys(normalized.map((e) => e.dedupeKey))
    const { fresh, duplicates } = dedupe(normalized, known)
    stats.duplicates = duplicates
    await opts.store.saveRawEvents(fresh, rawByKey)

    // 4. Entity resolution
    const clusters = resolveEntities(fresh)
    stats.clusters = clusters.length

    // 5. Compare with history → 6. momentum
    const allRefs = [...new Set(clusters.flatMap((c) => c.events.flatMap((e) => e.refs)))]
    const prior = await opts.store.priorMetrics(allRefs, new Date(now.getTime() - HISTORY_DAYS * 86_400_000))
    const existing = await opts.store.loadSignals(clusters.map(signalSlugFor))

    for (const cluster of clusters) {
      const refs = new Set(cluster.events.flatMap((e) => e.refs))
      const observations: Metric[] = [...cluster.events.flatMap((e) => e.metrics), ...[...refs].flatMap((r) => prior.get(r) ?? [])]
      const unique = new Map(observations.map((m) => [`${m.id}|${m.on}|${m.aggregation === 'periodic' ? m.value : ''}`, m]))
      const series: MetricSeries[] = buildSeries([...unique.values()], now)
      const slug = signalSlugFor(cluster)
      const previous = existing.get(slug)

      if (!previous && (!isRelevant(cluster) || !isCandidate(cluster, series, momentumRatio, now))) {
        stats.skippedBelowThreshold++
        continue
      }
      stats.candidates++

      // 7–9. Evidence, structured explanation, score
      const fresh = extractSignal(cluster, series, now, previous?.id ?? (opts.newId ?? (() => crypto.randomUUID()))())
      const signal = mergeWithExisting(fresh, previous)
      const issues = validateSignal(signal)
      if (issues.length) {
        log(`skipping ${slug}: ${issues.map((i) => `${i.path} ${i.message}`).join('; ')}`)
        continue
      }
      const score = computeBreakoutScore(signal)

      // 10. Store
      await opts.store.saveSignal(signal, score)
      storedSlugs.push(signal.slug)
      stats.stored++
    }

    const status = Object.keys(stats.errors).length === 0 ? 'succeeded' : stats.stored > 0 || Object.keys(stats.fetched).length ? 'partial' : 'failed'
    await opts.store.finishRun(runId, status, stats)
    return { runId, status, stats, storedSlugs }
  } catch (err) {
    await opts.store.finishRun(runId, 'failed', stats, (err as Error).message).catch(() => {})
    throw err
  }
}
