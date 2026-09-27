import 'server-only'
import { createSessionClient } from '@/lib/supabase/server'
import { rowsToSignal, type HistoryRow, type SignalRow, type SourceRow } from '@/lib/data/mapping'
import type { BreakoutScore, EntityRef } from '@/lib/domain/types'
import { computeBreakoutScore } from '@/lib/scoring/model'

/** Admin reads run as the signed-in admin; RLS lets them see hidden signals. */
export async function adminListSignals() {
  const db = (await createSessionClient())!
  const { data, error } = await db
    .from('signals')
    .select('id, slug, title, primary_topic, status, score_total, confidence_level, is_verified, is_hidden, is_demo, source_count, updated_at')
    .order('updated_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(error.message)
  return data as Pick<
    SignalRow,
    'id' | 'slug' | 'title' | 'primary_topic' | 'status' | 'score_total' | 'confidence_level' | 'is_verified' | 'is_hidden' | 'is_demo' | 'source_count' | 'updated_at'
  >[]
}

export async function adminPipelineRuns() {
  const db = (await createSessionClient())!
  const { data, error } = await db.from('pipeline_runs').select('*').order('started_at', { ascending: false }).limit(10)
  if (error) throw new Error(error.message)
  return data as { id: string; started_at: string; finished_at: string | null; status: string; stats: Record<string, unknown>; error: string | null }[]
}

export async function adminGetSignal(id: string) {
  const db = (await createSessionClient())!
  const { data: row, error } = await db.from('signals').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!row) return null
  const [sources, history, entities, scores] = await Promise.all([
    db.from('signal_sources').select('*').eq('signal_id', id),
    db.from('signal_history').select('*').eq('signal_id', id),
    db.from('signal_entities').select('entities(slug, name, kind)').eq('signal_id', id),
    db.from('signal_scores').select('computed_at, total, model_version, breakdown').eq('signal_id', id).order('computed_at', { ascending: false }).limit(10),
  ])
  const refs = ((entities.data ?? []) as unknown as { entities: EntityRef | null }[]).map((e) => e.entities).filter((e): e is EntityRef => !!e)
  const signal = rowsToSignal(row as SignalRow, (sources.data ?? []) as SourceRow[], (history.data ?? []) as HistoryRow[], refs)
  const history_ = (scores.data ?? []) as { computed_at: string; total: number; model_version: string; breakdown: BreakoutScore }[]
  return { signal, score: history_[0]?.breakdown ?? computeBreakoutScore(signal), scoreHistory: history_ }
}
