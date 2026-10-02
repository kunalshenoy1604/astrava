/**
 * Ingestion pipeline contracts.
 *
 *   Source adapter → RawEvent → NormalizedEvent → entity resolution →
 *   deduplication → candidate extraction → momentum + evidence → structured
 *   explanation → Breakout Score → storage → cache invalidation
 *
 * Adding a source means implementing `SourceAdapter` and registering it in
 * ./sources/index.ts. Nothing downstream changes.
 */
import type { SourceKind, SourceTier } from '@/lib/domain/types'

export interface PipelineEnv {
  GITHUB_TOKEN?: string
  HF_TOKEN?: string
  PIPELINE_RSS_FEEDS?: string
  PIPELINE_GITHUB_QUERY?: string
  PIPELINE_ARXIV_CATEGORIES?: string
  PIPELINE_NPM_KEYWORDS?: string
  PIPELINE_ENABLED_SOURCES?: string
  PIPELINE_USER_AGENT?: string
}

export interface FetchContext {
  now: Date
  /** Only fetch items newer than this. */
  since: Date
  env: PipelineEnv
  fetch: typeof fetch
  log: (msg: string) => void
}

export interface RawEvent {
  source: string
  externalId: string
  url: string
  occurredAt: string
  payload: unknown
}

export interface Metric {
  /** Stable metric id, e.g. 'github_stars_total', 'hn_points', 'npm_downloads_daily'. */
  id: string
  label: string
  unit: string
  value: number
  /** Date the value applies to (YYYY-MM-DD). */
  on: string
  /** cumulative totals are differenced into weekly gains; periodic values are summed per week. */
  aggregation: 'cumulative' | 'periodic'
}

export interface NormalizedEvent {
  source: string
  externalId: string
  dedupeKey: string
  url: string
  canonicalUrl: string
  title: string
  summary: string
  occurredAt: string
  kind: SourceKind
  tier: SourceTier
  publisher: string
  /** Whether the publisher is independent of the thing it describes. */
  independent: boolean
  /** Canonical references this event is about (e.g. 'github:owner/repo', 'arxiv:2409.01234'). */
  refs: string[]
  /** Free-text hints used for topic classification. */
  text: string
  metrics: Metric[]
  createdAt?: string
}

export interface SourceAdapter {
  id: string
  name: string
  /** Terms-of-use note shown in the methodology and README. */
  access: string
  isEnabled(env: PipelineEnv): boolean
  fetch(ctx: FetchContext): Promise<RawEvent[]>
  normalize(raw: RawEvent): NormalizedEvent | null
}

export interface EntityCluster {
  key: string
  name: string
  kind: 'repository' | 'paper' | 'technology' | 'organization'
  events: NormalizedEvent[]
}

export interface PipelineStats {
  fetched: Record<string, number>
  errors: Record<string, string>
  normalized: number
  duplicates: number
  clusters: number
  candidates: number
  stored: number
  skippedBelowThreshold: number
  ai?: { enriched: number; fromCache: number; filtered: number; verifiedClaims: number; droppedClaims: number; errors: number; rateLimited: boolean; lastError?: string }
}
