/**
 * Conversion between the domain `Signal` and database rows. Used by the
 * Supabase repository (read), the seed script and the pipeline (write).
 */
import type { BreakoutScore, EntityRef, MetricSeries, Signal, Source } from '@/lib/domain/types'
import { toSummary } from '@/lib/domain/summary'

export type SignalContent = Pick<
  Signal,
  | 'whatHappened'
  | 'whyItMatters'
  | 'technicalChange'
  | 'architecture'
  | 'developerImplications'
  | 'shouldCare'
  | 'difficulty'
  | 'adoptionSignals'
  | 'events'
  | 'risks'
  | 'competingApproaches'
  | 'builders'
  | 'scoreInputs'
>

export interface SignalRow {
  id: string
  slug: string
  title: string
  dek: string
  primary_topic: string
  topics: string[]
  status: Signal['status']
  time_to_impact: Signal['timeToImpact']
  first_seen_at: string
  updated_at: string
  is_verified: boolean
  is_hidden: boolean
  is_demo: boolean
  content: SignalContent
  score_total: number
  score_band: string
  confidence_level: 'high' | 'medium' | 'low'
  momentum_ratio: number | null
  developer_impact: string
  source_count: number
  independent_count: number
  sparkline: number[]
}

export interface SourceRow {
  signal_id: string
  local_id: string
  kind: Source['kind']
  tier: Source['tier']
  title: string
  publisher: string
  url: string
  published_at: string | null
  retrieved_at: string
  independent: boolean
  is_placeholder: boolean
  note: string | null
}

export interface HistoryRow {
  signal_id: string
  metric_id: string
  label: string
  unit: string
  provenance: MetricSeries['provenance']
  source_local_id: string | null
  min_volume: number | null
  observed_on: string
  value: number
}

export function contentOf(signal: Signal): SignalContent {
  const {
    whatHappened,
    whyItMatters,
    technicalChange,
    architecture,
    developerImplications,
    shouldCare,
    difficulty,
    adoptionSignals,
    events,
    risks,
    competingApproaches,
    builders,
    scoreInputs,
  } = signal
  return {
    whatHappened,
    whyItMatters,
    technicalChange,
    architecture,
    developerImplications,
    shouldCare,
    difficulty,
    adoptionSignals,
    events,
    risks,
    competingApproaches,
    builders,
    scoreInputs,
  }
}

export function signalToRows(signal: Signal, score: BreakoutScore) {
  const summary = toSummary(signal, score)
  const signalRow: SignalRow = {
    id: signal.id,
    slug: signal.slug,
    title: signal.title,
    dek: signal.dek,
    primary_topic: signal.primaryTopic,
    topics: signal.topics,
    status: signal.status,
    time_to_impact: signal.timeToImpact,
    first_seen_at: signal.firstSeenAt,
    updated_at: signal.updatedAt,
    is_verified: signal.verified,
    is_hidden: signal.hidden,
    is_demo: signal.isDemo,
    content: contentOf(signal),
    score_total: score.total,
    score_band: score.band,
    confidence_level: score.confidence.level,
    momentum_ratio: score.momentumRatio,
    developer_impact: summary.developerImpact,
    source_count: summary.sourceCount,
    independent_count: summary.independentSourceCount,
    sparkline: summary.sparkline,
  }
  const sourceRows: SourceRow[] = signal.sources.map((s) => ({
    signal_id: signal.id,
    local_id: s.id,
    kind: s.kind,
    tier: s.tier,
    title: s.title,
    publisher: s.publisher,
    url: s.url,
    published_at: s.publishedAt ?? null,
    retrieved_at: s.retrievedAt,
    independent: s.independent,
    is_placeholder: s.isPlaceholder ?? false,
    note: s.note ?? null,
  }))
  const historyRows: HistoryRow[] = signal.series.flatMap((series) =>
    series.points.map((p) => ({
      signal_id: signal.id,
      metric_id: series.id,
      label: series.label,
      unit: series.unit,
      provenance: series.provenance,
      source_local_id: series.sourceId ?? null,
      min_volume: series.minVolume ?? null,
      observed_on: p.date,
      value: p.value,
    })),
  )
  const entityRows = signal.entities.map((e) => ({ slug: e.slug, name: e.name, kind: e.kind }))
  const signalEntityRows = signal.entities.map((e) => ({ signal_id: signal.id, entity_slug: e.slug }))
  const scoreRow = { signal_id: signal.id, model_version: score.modelVersion, total: score.total, breakdown: score }
  return { signalRow, sourceRows, historyRows, entityRows, signalEntityRows, scoreRow }
}

export function rowsToSignal(
  row: SignalRow,
  sources: SourceRow[],
  history: HistoryRow[],
  entities: EntityRef[],
): Signal {
  const seriesMap = new Map<string, MetricSeries>()
  for (const h of [...history].sort((a, b) => a.observed_on.localeCompare(b.observed_on))) {
    let s = seriesMap.get(h.metric_id)
    if (!s) {
      s = {
        id: h.metric_id,
        label: h.label,
        unit: h.unit,
        provenance: h.provenance,
        ...(h.source_local_id ? { sourceId: h.source_local_id } : {}),
        ...(h.min_volume ? { minVolume: h.min_volume } : {}),
        points: [],
      }
      seriesMap.set(h.metric_id, s)
    }
    s.points.push({ date: h.observed_on, value: h.value })
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    dek: row.dek,
    primaryTopic: row.primary_topic,
    topics: row.topics,
    status: row.status,
    timeToImpact: row.time_to_impact,
    firstSeenAt: row.first_seen_at,
    updatedAt: row.updated_at,
    verified: row.is_verified,
    hidden: row.is_hidden,
    isDemo: row.is_demo,
    ...row.content,
    series: [...seriesMap.values()],
    entities,
    sources: sources.map((s) => ({
      id: s.local_id,
      kind: s.kind,
      tier: s.tier,
      title: s.title,
      publisher: s.publisher,
      url: s.url,
      ...(s.published_at ? { publishedAt: s.published_at } : {}),
      retrievedAt: s.retrieved_at,
      independent: s.independent,
      isPlaceholder: s.is_placeholder,
      ...(s.note ? { note: s.note } : {}),
    })),
  }
}
