import type { SupabaseClient } from '@supabase/supabase-js'
import type { BreakoutScore, EntityRef, Signal } from '@/lib/domain/types'
import type { Metric, NormalizedEvent, PipelineStats } from './types'
import { rowsToSignal, signalToRows, type HistoryRow, type SignalRow, type SourceRow } from '@/lib/data/mapping'

/**
 * Persistence boundary for the pipeline. The Supabase implementation uses the
 * service-role client (server only). The memory implementation backs tests
 * and `--dry-run`.
 */
export interface PipelineStore {
  knownDedupeKeys(keys: string[]): Promise<Set<string>>
  /** Metric observations previously recorded for these entity refs (for momentum baselines). */
  priorMetrics(refs: string[], since: Date): Promise<Map<string, Metric[]>>
  saveRawEvents(events: NormalizedEvent[], raw: Map<string, unknown>): Promise<void>
  loadSignals(slugs: string[]): Promise<Map<string, Signal>>
  saveSignal(signal: Signal, score: BreakoutScore): Promise<void>
  startRun(): Promise<string>
  finishRun(id: string, status: 'succeeded' | 'failed' | 'partial', stats: PipelineStats, error?: string): Promise<void>
}

export class MemoryPipelineStore implements PipelineStore {
  events = new Map<string, NormalizedEvent>()
  signals = new Map<string, { signal: Signal; score: BreakoutScore }>()
  runs: { id: string; status: string; stats?: PipelineStats }[] = []

  async knownDedupeKeys(keys: string[]) {
    return new Set(keys.filter((k) => this.events.has(k)))
  }
  async priorMetrics(refs: string[], since: Date) {
    const out = new Map<string, Metric[]>()
    for (const e of this.events.values()) {
      if (Date.parse(e.occurredAt) < since.getTime()) continue
      for (const ref of e.refs.filter((r) => refs.includes(r))) out.set(ref, [...(out.get(ref) ?? []), ...e.metrics])
    }
    return out
  }
  async saveRawEvents(events: NormalizedEvent[]) {
    for (const e of events) this.events.set(e.dedupeKey, e)
  }
  async loadSignals(slugs: string[]) {
    return new Map(slugs.filter((s) => this.signals.has(s)).map((s) => [s, this.signals.get(s)!.signal]))
  }
  async saveSignal(signal: Signal, score: BreakoutScore) {
    this.signals.set(signal.slug, { signal, score })
  }
  async startRun() {
    const id = `run-${this.runs.length + 1}`
    this.runs.push({ id, status: 'running' })
    return id
  }
  async finishRun(id: string, status: string, stats: PipelineStats) {
    const run = this.runs.find((r) => r.id === id)
    if (run) Object.assign(run, { status, stats })
  }
}

export class SupabasePipelineStore implements PipelineStore {
  constructor(private db: SupabaseClient) {}

  private check<T extends { error: { message: string } | null }>(res: T, ctx: string): T {
    if (res.error) throw new Error(`[pipeline store] ${ctx}: ${res.error.message}`)
    return res
  }

  async knownDedupeKeys(keys: string[]) {
    const found = new Set<string>()
    for (let i = 0; i < keys.length; i += 200) {
      const res = this.check(await this.db.from('raw_events').select('dedupe_key').in('dedupe_key', keys.slice(i, i + 200)), 'knownDedupeKeys')
      for (const r of res.data ?? []) found.add(r.dedupe_key as string)
    }
    return found
  }

  async priorMetrics(refs: string[], since: Date) {
    const out = new Map<string, Metric[]>()
    for (const ref of refs) {
      const res = this.check(
        await this.db
          .from('raw_events')
          .select('normalized')
          .contains('normalized', { refs: [ref] })
          .gte('fetched_at', since.toISOString())
          .limit(500),
        'priorMetrics',
      )
      const metrics = (res.data ?? []).flatMap((r) => ((r.normalized as NormalizedEvent).metrics ?? []) as Metric[])
      if (metrics.length) out.set(ref, metrics)
    }
    return out
  }

  async saveRawEvents(events: NormalizedEvent[], raw: Map<string, unknown>) {
    if (!events.length) return
    const rows = events.map((e) => ({
      source: e.source,
      external_id: e.externalId,
      dedupe_key: e.dedupeKey,
      occurred_at: e.occurredAt,
      url: e.url,
      payload: raw.get(e.dedupeKey) ?? {},
      normalized: e,
    }))
    for (let i = 0; i < rows.length; i += 200) {
      this.check(await this.db.from('raw_events').upsert(rows.slice(i, i + 200), { onConflict: 'dedupe_key', ignoreDuplicates: true }), 'saveRawEvents')
    }
  }

  async loadSignals(slugs: string[]) {
    const out = new Map<string, Signal>()
    if (!slugs.length) return out
    const res = this.check(await this.db.from('signals').select('*').in('slug', slugs), 'loadSignals')
    for (const row of (res.data ?? []) as SignalRow[]) {
      const [sources, history, entities] = await Promise.all([
        this.db.from('signal_sources').select('*').eq('signal_id', row.id),
        this.db.from('signal_history').select('*').eq('signal_id', row.id),
        this.db.from('signal_entities').select('entities(slug, name, kind)').eq('signal_id', row.id),
      ])
      const refs = ((entities.data ?? []) as unknown as { entities: EntityRef | null }[]).map((e) => e.entities).filter((e): e is EntityRef => !!e)
      out.set(row.slug, rowsToSignal(row, (sources.data ?? []) as SourceRow[], (history.data ?? []) as HistoryRow[], refs))
    }
    return out
  }

  async saveSignal(signal: Signal, score: BreakoutScore) {
    const rows = signalToRows(signal, score)
    this.check(await this.db.from('signals').upsert(rows.signalRow, { onConflict: 'id' }), 'upsert signal')
    const id = signal.id
    this.check(await this.db.from('signal_sources').delete().eq('signal_id', id), 'clear sources')
    if (rows.sourceRows.length) this.check(await this.db.from('signal_sources').insert(rows.sourceRows), 'insert sources')
    this.check(await this.db.from('signal_history').delete().eq('signal_id', id), 'clear history')
    if (rows.historyRows.length) this.check(await this.db.from('signal_history').insert(rows.historyRows), 'insert history')
    if (rows.entityRows.length) this.check(await this.db.from('entities').upsert(rows.entityRows, { onConflict: 'slug' }), 'upsert entities')
    this.check(await this.db.from('signal_entities').delete().eq('signal_id', id), 'clear signal_entities')
    if (rows.signalEntityRows.length) this.check(await this.db.from('signal_entities').insert(rows.signalEntityRows), 'insert signal_entities')
    this.check(await this.db.from('signal_scores').insert(rows.scoreRow), 'insert score')
  }

  async startRun() {
    const res = this.check(await this.db.from('pipeline_runs').insert({}).select('id').single(), 'startRun')
    return res.data!.id as string
  }

  async finishRun(id: string, status: string, stats: PipelineStats, error?: string) {
    this.check(
      await this.db.from('pipeline_runs').update({ status, stats, error: error ?? null, finished_at: new Date().toISOString() }).eq('id', id),
      'finishRun',
    )
  }
}
