/**
 * Hype penalty: subtracts up to HYPE_PENALTY_CAP points when attention runs
 * ahead of evidence. Each rule is independent and reported with its reason.
 */
import type { Signal } from '@/lib/domain/types'

export const HYPE_PENALTY_CAP = 15

/** Marketing superlatives that, on their own, carry no technical information. */
export const HYPE_LEXICON = [
  'revolutionary',
  'revolutionize',
  'breakthrough',
  'game-changer',
  'game-changing',
  'game changer',
  'paradigm shift',
  'unprecedented',
  'insane',
  'mind-blowing',
  'killer',
  'disrupt',
  '10x',
  '100x',
  'agi',
] as const

export const HYPE_RULES = {
  hypeLanguage: { perHit: 2, max: 6 },
  vendorOnlyBenchmark: { points: 4 },
  attentionOutpacingEvidence: { points: 5, ratio: 2, evidenceBelow: 5 },
} as const

function countHypeTerms(text: string): number {
  const lower = text.toLowerCase()
  return HYPE_LEXICON.reduce((n, term) => {
    const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z0-9]|$)`, 'g')
    return n + (lower.match(re)?.length ?? 0)
  }, 0)
}

export function computeHypePenalty(signal: Signal, evidencePoints: number): { points: number; reasons: string[] } {
  const reasons: string[] = []
  let penalty = 0

  // 1. Superlatives in source headlines (all tiers). Measures how a story is being told.
  const hits = signal.sources.reduce((n, s) => n + countHypeTerms(`${s.title} ${s.note ?? ''}`), 0)
  if (hits > 0) {
    const p = Math.min(hits * HYPE_RULES.hypeLanguage.perHit, HYPE_RULES.hypeLanguage.max)
    penalty += p
    reasons.push(`−${p}: ${hits} marketing superlative${hits === 1 ? '' : 's'} in source headlines.`)
  }

  // 2. Benchmarks exist but every one is published by the project itself.
  const benchmarks = signal.sources.filter((s) => s.kind === 'benchmark')
  if (benchmarks.length > 0 && benchmarks.every((b) => !b.independent)) {
    penalty += HYPE_RULES.vendorOnlyBenchmark.points
    reasons.push(`−${HYPE_RULES.vendorOnlyBenchmark.points}: all benchmarks are self-reported; none independent.`)
  }

  // 3. Discussion volume at least 2× the primary+secondary evidence while evidence strength is weak.
  const community = signal.sources.filter((s) => s.tier === 'community').length
  const substantive = signal.sources.length - community
  const { ratio, evidenceBelow, points } = HYPE_RULES.attentionOutpacingEvidence
  if (community > 0 && community >= ratio * Math.max(substantive, 1) && evidencePoints < evidenceBelow) {
    penalty += points
    reasons.push(`−${points}: ${community} community sources vs ${substantive} substantive; evidence strength below ${evidenceBelow}/10.`)
  }

  // 4. Analyst flags (recorded with a reason, visible in the breakdown).
  for (const flag of signal.scoreInputs.hypeFlags ?? []) {
    penalty += flag.points
    reasons.push(`−${flag.points}: ${flag.reason}`)
  }

  const capped = Math.min(penalty, HYPE_PENALTY_CAP)
  if (capped < penalty) reasons.push(`Penalty capped at −${HYPE_PENALTY_CAP}.`)
  return { points: capped === 0 ? 0 : -capped, reasons }
}
