'use server'

import { updateTag } from 'next/cache'
import { requireAdmin } from '@/lib/auth/viewer'
import { createSessionClient } from '@/lib/supabase/server'
import { adminSignalUpdateSchema } from '@/lib/domain/validate'
import { TOPIC_BY_SLUG } from '@/lib/demo/topics'
import { rateLimit } from '@/lib/security/rate-limit'
import { computeBreakoutScore, developerImpact } from '@/lib/scoring/model'
import { rowsToSignal, type HistoryRow, type SignalRow, type SourceRow } from '@/lib/data/mapping'
import { SIGNALS_TAG } from '@/lib/data/queries'
import type { RubricLevel } from '@/lib/domain/types'

export interface AdminActionState {
  ok: boolean
  message: string
}

const toLevel = (v: '' | number): RubricLevel | null => (v === '' ? null : (v as RubricLevel))

/**
 * Updates editorial metadata and analyst rubric levels, then recomputes the
 * Breakout Score with the same model the pipeline uses and appends it to
 * signal_scores. RLS enforces admin-only writes; requireAdmin is the
 * application-level check.
 */
export async function updateSignalAction(_prev: AdminActionState | null, formData: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Not authorised.' }
  const limited = await rateLimit('admin')
  if (!limited.allowed) return { ok: false, message: 'Rate limited.' }

  const parsed = adminSignalUpdateSchema.safeParse({
    ...Object.fromEntries(formData),
    hidden: formData.get('hidden') === 'on',
    verified: formData.get('verified') === 'on',
  })
  if (!parsed.success) return { ok: false, message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') }
  const input = parsed.data
  if (!TOPIC_BY_SLUG.has(input.primaryTopic)) return { ok: false, message: 'Unknown topic.' }

  const db = (await createSessionClient())!
  const { data: row, error } = await db.from('signals').select('*').eq('id', input.id).maybeSingle()
  if (error || !row) return { ok: false, message: 'Signal not found.' }
  const current = row as SignalRow

  const [sources, history, entities] = await Promise.all([
    db.from('signal_sources').select('*').eq('signal_id', input.id),
    db.from('signal_history').select('*').eq('signal_id', input.id),
    db.from('signal_entities').select('entities(slug, name, kind)').eq('signal_id', input.id),
  ])
  if (sources.error || history.error || entities.error) return { ok: false, message: 'Could not load signal evidence.' }

  const content = structuredClone(current.content)
  const stamp = `Set by analyst review on ${new Date().toISOString().slice(0, 10)}.`
  for (const key of ['novelty', 'technicalSignificance', 'developerRelevance'] as const) {
    const next = toLevel(input[key])
    const prev = content.scoreInputs.assessed[key]
    if (next !== prev.level || prev.rationale.startsWith('Heuristic (automated)')) {
      content.scoreInputs.assessed[key] = { level: next, rationale: next === null ? 'Cleared by analyst; awaiting assessment.' : stamp }
    }
  }

  const topics = current.topics.includes(input.primaryTopic) ? current.topics : [input.primaryTopic, ...current.topics]
  const updated: SignalRow = {
    ...current,
    title: input.title,
    dek: input.dek,
    primary_topic: input.primaryTopic,
    topics,
    status: input.status,
    time_to_impact: input.timeToImpact,
    is_hidden: input.hidden,
    is_verified: input.verified,
    content,
    updated_at: new Date().toISOString(),
  }
  const signal = rowsToSignal(
    updated,
    sources.data as SourceRow[],
    history.data as HistoryRow[],
    ((entities.data ?? []) as unknown as { entities: { slug: string; name: string; kind: never } | null }[])
      .map((e) => e.entities)
      .filter((e): e is NonNullable<typeof e> => Boolean(e)),
  )
  const score = computeBreakoutScore(signal)

  const upd = await db
    .from('signals')
    .update({
      title: updated.title,
      dek: updated.dek,
      primary_topic: updated.primary_topic,
      topics: updated.topics,
      status: updated.status,
      time_to_impact: updated.time_to_impact,
      is_hidden: updated.is_hidden,
      is_verified: updated.is_verified,
      content: updated.content,
      updated_at: updated.updated_at,
      score_total: score.total,
      score_band: score.band,
      confidence_level: score.confidence.level,
      momentum_ratio: score.momentumRatio,
      developer_impact: developerImpact(signal),
    })
    .eq('id', input.id)
  if (upd.error) return { ok: false, message: `Update failed: ${upd.error.message}` }
  const ins = await db.from('signal_scores').insert({ signal_id: input.id, model_version: score.modelVersion, total: score.total, breakdown: score })
  if (ins.error) return { ok: false, message: `Score history failed: ${ins.error.message}` }

  updateTag(SIGNALS_TAG)
  return { ok: true, message: `Saved. Breakout Score recomputed: ${score.total}.` }
}
