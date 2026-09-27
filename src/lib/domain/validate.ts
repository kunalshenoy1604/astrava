import { z } from 'zod'
import type { Signal, Statement } from './types'
import { isSafeHttpUrl } from '@/lib/security/url'

/**
 * Integrity checks applied to every signal before it is stored or rendered
 * from the demo dataset. The core anti-fabrication rule: a statement marked
 * FACT must cite at least one source that exists on the same signal.
 */
export interface ValidationIssue {
  path: string
  message: string
}

function collectStatements(signal: Signal): [string, Statement][] {
  const out: [string, Statement][] = []
  const push = (path: string, list: Statement[]) => list.forEach((s, i) => out.push([`${path}[${i}]`, s]))
  push('whatHappened', signal.whatHappened)
  push('whyItMatters', signal.whyItMatters)
  push('technicalChange', signal.technicalChange)
  push('developerImplications', signal.developerImplications)
  push('risks', signal.risks)
  const sc = signal.shouldCare
  push('shouldCare.whatChanged', sc.whatChanged)
  push('shouldCare.whoIsAffected', sc.whoIsAffected)
  push('shouldCare.whatCanDevelopersDo', sc.whatCanDevelopersDo)
  push('shouldCare.whatWouldMakeItImportant', sc.whatWouldMakeItImportant)
  push('shouldCare.whatCouldPreventAdoption', sc.whatCouldPreventAdoption)
  out.push(['shouldCare.productionReadiness', sc.productionReadiness.statement])
  signal.competingApproaches.forEach((c, i) => out.push([`competingApproaches[${i}]`, c.note]))
  signal.builders.forEach((b, i) => out.push([`builders[${i}]`, b.note]))
  if (signal.architecture?.note) out.push(['architecture.note', signal.architecture.note])
  return out
}

export function validateSignal(signal: Signal): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const ids = new Set(signal.sources.map((s) => s.id))

  for (const [path, st] of collectStatements(signal)) {
    if (st.kind === 'fact' && (!st.sourceIds || st.sourceIds.length === 0)) {
      issues.push({ path, message: 'FACT statement has no source.' })
    }
    for (const id of st.sourceIds ?? []) {
      if (!ids.has(id)) issues.push({ path, message: `Unknown source id "${id}".` })
    }
  }
  for (const [i, a] of signal.adoptionSignals.entries()) {
    if (a.kind === 'fact' && a.value !== null && a.sourceIds.length === 0) {
      issues.push({ path: `adoptionSignals[${i}]`, message: 'Adoption value marked FACT without a source.' })
    }
    for (const id of a.sourceIds) if (!ids.has(id)) issues.push({ path: `adoptionSignals[${i}]`, message: `Unknown source id "${id}".` })
  }
  for (const [i, e] of signal.events.entries()) {
    for (const id of e.sourceIds) if (!ids.has(id)) issues.push({ path: `events[${i}]`, message: `Unknown source id "${id}".` })
  }
  for (const s of signal.sources) {
    if (!isSafeHttpUrl(s.url)) issues.push({ path: `sources.${s.id}`, message: 'URL is not a safe http(s) URL.' })
    if (signal.isDemo && !s.isPlaceholder) {
      issues.push({ path: `sources.${s.id}`, message: 'Demo signals may only use placeholder sources.' })
    }
  }
  for (const series of signal.series) {
    if (series.sourceId && !ids.has(series.sourceId)) {
      issues.push({ path: `series.${series.id}`, message: `Unknown source id "${series.sourceId}".` })
    }
    if (signal.isDemo && series.provenance !== 'demo') {
      issues.push({ path: `series.${series.id}`, message: 'Demo signals may only contain demo series.' })
    }
  }
  const rateSource = signal.scoreInputs.adoptionRate?.sourceId
  if (rateSource && !ids.has(rateSource)) issues.push({ path: 'scoreInputs.adoptionRate', message: `Unknown source id "${rateSource}".` })
  const { momentumSeriesId, adoptionSeriesId } = signal.scoreInputs
  for (const sid of [momentumSeriesId, adoptionSeriesId]) {
    if (sid && !signal.series.some((s) => s.id === sid)) issues.push({ path: 'scoreInputs', message: `Unknown series "${sid}".` })
  }
  return issues
}

/* Admin form schema ------------------------------------------------- */

const level = z.union([z.literal(''), z.coerce.number().int().min(0).max(4)])

export const adminSignalUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(8).max(180),
  dek: z.string().trim().min(8).max(320),
  primaryTopic: z.string().trim().regex(/^[a-z0-9-]{2,64}$/),
  status: z.enum(['early-signal', 'emerging', 'accelerating', 'establishing', 'cooling', 'unconfirmed']),
  timeToImpact: z.enum(['0-3m', '3-6m', '6-12m', '12-24m', '24m+', 'unknown']),
  hidden: z.coerce.boolean(),
  verified: z.coerce.boolean(),
  novelty: level,
  technicalSignificance: level,
  developerRelevance: level,
})
export type AdminSignalUpdate = z.infer<typeof adminSignalUpdateSchema>
