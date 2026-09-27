import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BreakoutScore, EntityRef, SearchResult, SignalSummary } from '@/lib/domain/types'
import { computeBreakoutScore } from '@/lib/scoring/model'
import { normalizeQuery } from '@/lib/search/rank'
import { rowsToSignal, type HistoryRow, type SignalRow, type SourceRow } from './mapping'
import type { ListOptions, SignalRepository } from './repository'

const SUMMARY_COLUMNS =
  'id, slug, title, dek, primary_topic, topics, status, time_to_impact, first_seen_at, updated_at, is_verified, is_demo, score_total, score_band, confidence_level, momentum_ratio, developer_impact, source_count, independent_count, sparkline'

type SummaryRow = Omit<SignalRow, 'content' | 'is_hidden'>

const DEFAULT_LIMIT = 60

function rowToSummary(r: SummaryRow): SignalSummary {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    dek: r.dek,
    primaryTopic: r.primary_topic,
    topics: r.topics,
    status: r.status,
    timeToImpact: r.time_to_impact,
    firstSeenAt: r.first_seen_at,
    updatedAt: r.updated_at,
    verified: r.is_verified,
    isDemo: r.is_demo,
    score: r.score_total,
    band: r.score_band as SignalSummary['band'],
    confidence: r.confidence_level,
    momentumRatio: r.momentum_ratio,
    developerImpact: r.developer_impact as SignalSummary['developerImpact'],
    sourceCount: r.source_count,
    independentSourceCount: r.independent_count,
    sparkline: r.sparkline ?? [],
  }
}

function fail(context: string, error: { message: string }): never {
  throw new Error(`[supabase] ${context}: ${error.message}`)
}

export function createSupabaseRepository(db: SupabaseClient): SignalRepository {
  return {
    mode: 'supabase',

    async listSignals(options: ListOptions = {}) {
      let q = db.from('signals').select(SUMMARY_COLUMNS).eq('is_hidden', false)
      if (options.topics?.length) q = q.overlaps('topics', options.topics)
      if (options.status) q = q.eq('status', options.status)
      const sort = options.sort ?? 'score'
      if (sort === 'recent') q = q.order('updated_at', { ascending: false })
      else if (sort === 'momentum') q = q.order('momentum_ratio', { ascending: false, nullsFirst: false })
      else q = q.order('score_total', { ascending: false }).order('updated_at', { ascending: false })
      const { data, error } = await q.limit(options.limit ?? DEFAULT_LIMIT)
      if (error) fail('listSignals', error)
      return (data as SummaryRow[]).map(rowToSummary)
    },

    async getSignal(slug) {
      const { data: row, error } = await db.from('signals').select('*').eq('slug', slug).eq('is_hidden', false).maybeSingle()
      if (error) fail('getSignal', error)
      if (!row) return null
      const id = (row as SignalRow).id
      const [sources, history, entities, scores] = await Promise.all([
        db.from('signal_sources').select('*').eq('signal_id', id).order('published_at', { ascending: true }),
        db.from('signal_history').select('*').eq('signal_id', id),
        db.from('signal_entities').select('entities(slug, name, kind)').eq('signal_id', id),
        db.from('signal_scores').select('breakdown').eq('signal_id', id).order('computed_at', { ascending: false }).limit(1),
      ])
      for (const r of [sources, history, entities, scores]) if (r.error) fail('getSignal children', r.error)
      const entityRefs = ((entities.data ?? []) as unknown as { entities: EntityRef | null }[])
        .map((e) => e.entities)
        .filter((e): e is EntityRef => Boolean(e))
      const signal = rowsToSignal(row as SignalRow, (sources.data ?? []) as SourceRow[], (history.data ?? []) as HistoryRow[], entityRefs)
      const stored = (scores.data?.[0] as { breakdown: BreakoutScore } | undefined)?.breakdown
      // Stored score is authoritative (it is what the feed shows); recompute only if missing.
      return { signal, score: stored ?? computeBreakoutScore(signal) }
    },

    async getSummariesBySlugs(slugs) {
      if (slugs.length === 0) return []
      const { data, error } = await db.from('signals').select(SUMMARY_COLUMNS).in('slug', slugs).eq('is_hidden', false)
      if (error) fail('getSummariesBySlugs', error)
      return (data as SummaryRow[]).map(rowToSummary)
    },

    async listSlugs() {
      const { data, error } = await db.from('signals').select('slug, updated_at').eq('is_hidden', false).order('updated_at', { ascending: false }).limit(5000)
      if (error) fail('listSlugs', error)
      return (data as { slug: string; updated_at: string }[]).map((r) => ({ slug: r.slug, updatedAt: r.updated_at }))
    },

    async search(query) {
      const q = normalizeQuery(query)
      if (!q) return []
      const { data, error } = await db.rpc('search_all', { q, max_results: 30 })
      if (error) fail('search', error)
      return (data as { result_type: string; title: string; href: string; snippet: string; meta: string[]; score: number | null }[]).map(
        (r): SearchResult => ({
          type: r.result_type as SearchResult['type'],
          title: r.title,
          href: r.href,
          snippet: r.snippet,
          meta: r.meta ?? [],
          ...(r.score !== null ? { score: r.score } : {}),
        }),
      )
    },

    async status() {
      const [count, latest] = await Promise.all([
        db.from('signals').select('id', { count: 'exact', head: true }).eq('is_hidden', false),
        db.from('signals').select('updated_at').eq('is_hidden', false).order('updated_at', { ascending: false }).limit(1),
      ])
      if (count.error) fail('status', count.error)
      return {
        mode: 'supabase',
        signalCount: count.count ?? 0,
        lastUpdated: (latest.data?.[0] as { updated_at: string } | undefined)?.updated_at ?? null,
        lastPipelineRun: null,
      }
    },
  }
}
