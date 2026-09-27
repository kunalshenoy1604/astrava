import type { BreakoutScore, SearchResult, Signal, SignalStatus, SignalSummary } from '@/lib/domain/types'
import type { SignalSort } from '@/lib/domain/summary'

export interface ListOptions {
  topics?: string[]
  status?: SignalStatus
  sort?: SignalSort
  limit?: number
}

export interface DatasetStatus {
  mode: 'demo' | 'supabase'
  signalCount: number
  lastUpdated: string | null
  lastPipelineRun: { finishedAt: string | null; status: string } | null
}

/**
 * Read-side data access. Implementations: in-memory demo dataset, and
 * Supabase (Postgres). Pages never talk to a database client directly.
 */
export interface SignalRepository {
  readonly mode: 'demo' | 'supabase'
  listSignals(options?: ListOptions): Promise<SignalSummary[]>
  getSignal(slug: string): Promise<{ signal: Signal; score: BreakoutScore } | null>
  getSummariesBySlugs(slugs: string[]): Promise<SignalSummary[]>
  listSlugs(): Promise<{ slug: string; updatedAt: string }[]>
  search(query: string): Promise<SearchResult[]>
  status(): Promise<DatasetStatus>
}
