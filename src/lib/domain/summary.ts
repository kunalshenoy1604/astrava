import type { BreakoutScore, Signal, SignalSummary } from './types'
import { computeBreakoutScore, developerImpact, independentSubstantivePublishers } from '@/lib/scoring/model'

export function toSummary(signal: Signal, score: BreakoutScore = computeBreakoutScore(signal)): SignalSummary {
  const momentumSeries = signal.series.find((s) => s.id === signal.scoreInputs.momentumSeriesId) ?? signal.series[0]
  return {
    id: signal.id,
    slug: signal.slug,
    title: signal.title,
    dek: signal.dek,
    primaryTopic: signal.primaryTopic,
    topics: signal.topics,
    status: signal.status,
    timeToImpact: signal.timeToImpact,
    firstSeenAt: signal.firstSeenAt,
    updatedAt: signal.updatedAt,
    verified: signal.verified,
    isDemo: signal.isDemo,
    score: score.total,
    band: score.band,
    confidence: score.confidence.level,
    momentumRatio: score.momentumRatio,
    developerImpact: developerImpact(signal),
    sourceCount: signal.sources.length,
    independentSourceCount: independentSubstantivePublishers(signal.sources),
    sparkline: momentumSeries?.points.map((p) => p.value) ?? [],
  }
}

export type SignalSort = 'score' | 'recent' | 'momentum'

export function sortSummaries(list: SignalSummary[], sort: SignalSort): SignalSummary[] {
  const copy = [...list]
  if (sort === 'recent') return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  if (sort === 'momentum') return copy.sort((a, b) => (b.momentumRatio ?? 0) - (a.momentumRatio ?? 0))
  return copy.sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt))
}

export interface RadarStats {
  total: number
  highMomentum: number
  earlyStage: number
  potentiallySignificant: number
}

/** Thresholds for the radar summary; shown next to the numbers in the UI. */
export const RADAR_THRESHOLDS = { highMomentum: 2, significantScore: 80 } as const

export function radarStats(list: SignalSummary[]): RadarStats {
  return {
    total: list.length,
    highMomentum: list.filter((s) => (s.momentumRatio ?? 0) >= RADAR_THRESHOLDS.highMomentum).length,
    earlyStage: list.filter((s) => s.status === 'early-signal' || s.status === 'unconfirmed').length,
    potentiallySignificant: list.filter((s) => s.score >= RADAR_THRESHOLDS.significantScore).length,
  }
}
