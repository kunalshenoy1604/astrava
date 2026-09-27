/**
 * Breakout Score — model v1.2
 *
 * A transparent, deterministic ranking. It is NOT a prediction and NOT an LLM
 * opinion: every point is traceable to either an analyst rubric (shown as
 * ANALYSIS), a measurement over stored time series and sources, or a labelled
 * estimate. The same function runs in the ingestion pipeline, the admin area,
 * and the demo dataset, so the number on screen is always reproducible.
 *
 * Weights (sum = 100) and the hype penalty (0 to −15) are documented on
 * /methodology, which imports these constants directly.
 */
import type {
  BreakoutScore,
  FactorId,
  FactorResult,
  MetricSeries,
  RubricLevel,
  Signal,
  Source,
  SourceTier,
  TimeToImpact,
} from '@/lib/domain/types'
import { computeHypePenalty, HYPE_PENALTY_CAP } from './hype'

export const SCORE_MODEL_VERSION = 'breakout-v1.2'

export const FACTOR_WEIGHTS: Record<FactorId, number> = {
  novelty: 15,
  technicalSignificance: 15,
  developerRelevance: 15,
  adoptionVelocity: 10,
  communityMomentum: 10,
  sourceCredibility: 10,
  crossSourceConfirmation: 10,
  evidenceStrength: 10,
  timeToImpact: 5,
}

export const FACTOR_LABELS: Record<FactorId, string> = {
  novelty: 'Novelty',
  technicalSignificance: 'Technical significance',
  developerRelevance: 'Developer relevance',
  adoptionVelocity: 'Adoption velocity',
  communityMomentum: 'Community momentum',
  sourceCredibility: 'Source credibility',
  crossSourceConfirmation: 'Cross-source confirmation',
  evidenceStrength: 'Evidence strength',
  timeToImpact: 'Time to impact',
}

export const RUBRIC_LABELS: Record<RubricLevel, string> = {
  0: 'None',
  1: 'Low',
  2: 'Moderate',
  3: 'High',
  4: 'Exceptional',
}

export const TIER_WEIGHT: Record<SourceTier, number> = {
  primary: 1,
  secondary: 0.7,
  community: 0.35,
}

export const TIME_TO_IMPACT_POINTS: Record<TimeToImpact, number> = {
  '0-3m': 5,
  '3-6m': 4,
  '6-12m': 3,
  '12-24m': 2,
  '24m+': 1,
  unknown: 0,
}

/** Momentum ratio at which the momentum factor saturates (8× the trailing baseline). */
export const MOMENTUM_SATURATION = 8
/** Below this many events in the latest period, momentum points are scaled down proportionally. */
export const MOMENTUM_MIN_VOLUME = 20
/** Number of trailing periods that form the momentum baseline. */
export const MOMENTUM_BASELINE_PERIODS = 4
/** Independent integrations at which that half of adoption velocity saturates. */
export const INTEGRATION_SATURATION = 5
/** Growth over the adoption window (as a multiple of the starting value) at which growth saturates. */
export const ADOPTION_GROWTH_SATURATION = 4
/** Independent publishers at which cross-source confirmation saturates. */
export const CONFIRMATION_SATURATION = 5

export const CONFIDENCE_WEIGHTS = { coverage: 0.3, independent: 0.3, primary: 0.2, evidence: 0.2, hype: 0.2 } as const
/** Independent non-community publishers at which that part of confidence saturates. */
export const CONFIDENCE_INDEPENDENT_SATURATION = 3

export const BAND_THRESHOLDS = { breakout: 80, strong: 65, watching: 50 } as const

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const round1 = (n: number) => Math.round(n * 10) / 10

/* ------------------------------------------------------------------ */
/* Measurements                                                        */
/* ------------------------------------------------------------------ */

/**
 * Latest period divided by the mean of up to MOMENTUM_BASELINE_PERIODS
 * preceding periods. Returns null when fewer than 3 points exist or the
 * baseline is zero (a ratio against nothing is meaningless).
 */
export function momentumRatio(series: MetricSeries | undefined): number | null {
  if (!series || series.points.length < 3) return null
  const pts = series.points
  const latest = pts[pts.length - 1]!.value
  const baseline = pts.slice(Math.max(0, pts.length - 1 - MOMENTUM_BASELINE_PERIODS), pts.length - 1)
  const mean = baseline.reduce((s, p) => s + p.value, 0) / baseline.length
  if (mean <= 0) return null
  return latest / mean
}

/** Growth of a cumulative adoption series over its window, as a multiple of the first value. */
export function adoptionGrowth(series: MetricSeries | undefined): number | null {
  if (!series || series.points.length < 2) return null
  const first = series.points[0]!.value
  const last = series.points[series.points.length - 1]!.value
  if (first <= 0) return last > 0 ? ADOPTION_GROWTH_SATURATION : null
  return (last - first) / first
}

export function independentPublishers(sources: Source[]): number {
  const names = new Set(
    sources.filter((s) => s.independent && s.tier !== 'community').map((s) => s.publisher.trim().toLowerCase()),
  )
  const community = new Set(
    sources.filter((s) => s.independent && s.tier === 'community').map((s) => s.publisher.trim().toLowerCase()),
  )
  // Community publishers count half: they confirm attention, not correctness.
  return names.size + community.size * 0.5
}

export function independentSubstantivePublishers(sources: Source[]): number {
  return new Set(sources.filter((s) => s.independent && s.tier !== 'community').map((s) => s.publisher.trim().toLowerCase())).size
}

/* ------------------------------------------------------------------ */
/* Factors                                                             */
/* ------------------------------------------------------------------ */

function assessedFactor(id: 'novelty' | 'technicalSignificance' | 'developerRelevance', signal: Signal): FactorResult {
  const input = signal.scoreInputs.assessed[id]
  const max = FACTOR_WEIGHTS[id]
  if (input.level === null) {
    return {
      id,
      label: FACTOR_LABELS[id],
      points: 0,
      max,
      basis: 'assessed',
      explanation: `Not yet assessed. ${input.rationale}`.trim(),
      insufficient: true,
    }
  }
  return {
    id,
    label: FACTOR_LABELS[id],
    points: round1((input.level / 4) * max),
    max,
    basis: 'assessed',
    explanation: `Rubric level ${input.level}/4 (${RUBRIC_LABELS[input.level]}). ${input.rationale}`,
    insufficient: false,
  }
}

function adoptionFactor(signal: Signal): FactorResult {
  const max = FACTOR_WEIGHTS.adoptionVelocity
  const series = signal.series.find((s) => s.id === signal.scoreInputs.adoptionSeriesId)
  const growth = adoptionGrowth(series)
  const integrations = signal.scoreInputs.independentIntegrations
  if (growth === null && integrations === null) {
    return {
      id: 'adoptionVelocity',
      label: FACTOR_LABELS.adoptionVelocity,
      points: 0,
      max,
      basis: 'measured',
      explanation: 'No adoption series or integration count is available.',
      insufficient: true,
    }
  }
  const half = max / 2
  const integrationPts = integrations === null ? 0 : (Math.min(integrations, INTEGRATION_SATURATION) / INTEGRATION_SATURATION) * half
  const growthPts =
    growth === null ? 0 : clamp(Math.log2(1 + Math.max(0, growth)) / Math.log2(1 + ADOPTION_GROWTH_SATURATION), 0, 1) * half
  const parts: string[] = []
  parts.push(
    integrations === null
      ? 'Independent integrations: unknown (0 pts).'
      : `${integrations} independent integration${integrations === 1 ? '' : 's'} (${round1(integrationPts)}/${half}).`,
  )
  parts.push(
    growth === null
      ? 'Adoption growth: no series (0 pts).'
      : `${series!.label} grew ${Math.round(growth * 100)}% over the window (${round1(growthPts)}/${half}).`,
  )
  return {
    id: 'adoptionVelocity',
    label: FACTOR_LABELS.adoptionVelocity,
    points: round1(integrationPts + growthPts),
    max,
    basis: 'measured',
    explanation: parts.join(' '),
    insufficient: false,
  }
}

function momentumFactor(signal: Signal): { factor: FactorResult; ratio: number | null } {
  const max = FACTOR_WEIGHTS.communityMomentum
  const series = signal.series.find((s) => s.id === signal.scoreInputs.momentumSeriesId)
  const ratio = momentumRatio(series)
  if (ratio === null) {
    return {
      ratio,
      factor: {
        id: 'communityMomentum',
        label: FACTOR_LABELS.communityMomentum,
        points: 0,
        max,
        basis: 'measured',
        explanation: 'Fewer than three periods of activity data, or no baseline activity to compare against.',
        insufficient: true,
      },
    }
  }
  const latest = series!.points[series!.points.length - 1]!.value
  const minVolume = series!.minVolume ?? MOMENTUM_MIN_VOLUME
  const volume = Math.min(1, latest / minVolume)
  const pts = clamp(Math.log2(Math.max(ratio, 1)) / Math.log2(MOMENTUM_SATURATION), 0, 1) * max * volume
  return {
    ratio,
    factor: {
      id: 'communityMomentum',
      label: FACTOR_LABELS.communityMomentum,
      points: round1(pts),
      max,
      basis: 'measured',
      explanation:
        `${series!.label}: latest period is ${ratio.toFixed(1)}× the trailing ${MOMENTUM_BASELINE_PERIODS}-period mean. Full marks at ${MOMENTUM_SATURATION}×.` +
        (volume < 1 ? ` Dampened to ${Math.round(volume * 100)}% because the latest period has fewer than ${minVolume} events.` : ''),
      insufficient: false,
    },
  }
}

function credibilityFactor(sources: Source[]): FactorResult {
  const max = FACTOR_WEIGHTS.sourceCredibility
  if (sources.length === 0) {
    return {
      id: 'sourceCredibility',
      label: FACTOR_LABELS.sourceCredibility,
      points: 0,
      max,
      basis: 'measured',
      explanation: 'No sources recorded.',
      insufficient: true,
    }
  }
  const hasPrimary = sources.some((s) => s.tier === 'primary')
  const meanWeight = sources.reduce((s, src) => s + TIER_WEIGHT[src.tier], 0) / sources.length
  const pts = max * (0.6 * (hasPrimary ? 1 : 0) + 0.4 * meanWeight)
  return {
    id: 'sourceCredibility',
    label: FACTOR_LABELS.sourceCredibility,
    points: round1(pts),
    max,
    basis: 'measured',
    explanation: `${hasPrimary ? 'Primary source present' : 'No primary source'}; mean source-tier weight ${meanWeight.toFixed(2)} (primary 1.0, secondary 0.7, community 0.35).`,
    insufficient: false,
  }
}

function confirmationFactor(sources: Source[]): FactorResult {
  const max = FACTOR_WEIGHTS.crossSourceConfirmation
  const n = independentPublishers(sources)
  return {
    id: 'crossSourceConfirmation',
    label: FACTOR_LABELS.crossSourceConfirmation,
    points: round1((Math.min(n, CONFIRMATION_SATURATION) / CONFIRMATION_SATURATION) * max),
    max,
    basis: 'measured',
    explanation:
      n === 0
        ? 'No independent publisher has confirmed this yet.'
        : `${n} independent publisher-equivalents (community publishers count ½). Full marks at ${CONFIRMATION_SATURATION}.`,
    insufficient: n === 0,
  }
}

function evidenceFactor(signal: Signal): FactorResult {
  const max = FACTOR_WEIGHTS.evidenceStrength
  const { sources, scoreInputs } = signal
  const checks: [string, boolean | null][] = [
    ['primary source', sources.some((s) => s.tier === 'primary')],
    [
      'runnable artifact (code, weights or package)',
      scoreInputs.runnableArtifact ?? (sources.some((s) => s.kind === 'github') ? true : null),
    ],
    ['reproducible or independent benchmark', scoreInputs.reproducibleBenchmark],
    ['technical documentation or paper', sources.some((s) => s.kind === 'documentation' || s.kind === 'paper')],
  ]
  const per = max / checks.length
  const met = checks.filter(([, v]) => v === true)
  const unknown = checks.filter(([, v]) => v === null)
  return {
    id: 'evidenceStrength',
    label: FACTOR_LABELS.evidenceStrength,
    points: round1(met.length * per),
    max,
    basis: 'measured',
    explanation:
      `Met ${met.length}/${checks.length}: ${checks.map(([k, v]) => `${k} ${v === true ? '✓' : v === null ? '?' : '✗'}`).join(', ')}.` +
      (unknown.length ? ` ${unknown.length} unknown (scored 0).` : ''),
    insufficient: met.length === 0,
  }
}

function timeFactor(signal: Signal): FactorResult {
  const max = FACTOR_WEIGHTS.timeToImpact
  const pts = TIME_TO_IMPACT_POINTS[signal.timeToImpact]
  return {
    id: 'timeToImpact',
    label: FACTOR_LABELS.timeToImpact,
    points: pts,
    max,
    basis: 'estimate',
    explanation:
      signal.timeToImpact === 'unknown'
        ? 'No time-to-impact estimate yet.'
        : 'Nearer expected impact scores higher. This is an estimate, not a measurement.',
    insufficient: signal.timeToImpact === 'unknown',
  }
}

/* ------------------------------------------------------------------ */
/* Confidence                                                          */
/* ------------------------------------------------------------------ */

function computeConfidence(signal: Signal, factors: FactorResult[], hypePoints: number): BreakoutScore['confidence'] {
  const measured = factors.filter((f) => f.basis === 'measured')
  const coverage = measured.filter((f) => !f.insufficient).length / measured.length
  const substantive = independentSubstantivePublishers(signal.sources)
  const hasPrimary = signal.sources.some((s) => s.tier === 'primary')
  const evidence = factors.find((f) => f.id === 'evidenceStrength')!
  let value =
    CONFIDENCE_WEIGHTS.coverage * coverage +
    CONFIDENCE_WEIGHTS.independent * (Math.min(substantive, CONFIDENCE_INDEPENDENT_SATURATION) / CONFIDENCE_INDEPENDENT_SATURATION) +
    CONFIDENCE_WEIGHTS.primary * (hasPrimary ? 1 : 0) +
    CONFIDENCE_WEIGHTS.evidence * (evidence.points / evidence.max) -
    CONFIDENCE_WEIGHTS.hype * (Math.abs(hypePoints) / HYPE_PENALTY_CAP)
  value = clamp(value, 0, 1)
  const reasons = [
    `${Math.round(coverage * 100)}% of measured factors have data.`,
    `${substantive} independent non-community publisher${substantive === 1 ? '' : 's'}.`,
    hasPrimary ? 'At least one primary source.' : 'No primary source.',
    `Evidence strength ${evidence.points}/${evidence.max}.`,
  ]
  if (hypePoints < 0) reasons.push(`Hype penalty ${hypePoints} lowers confidence.`)
  let level: 'high' | 'medium' | 'low' = value >= 0.75 ? 'high' : value >= 0.5 ? 'medium' : 'low'
  if (substantive === 0) {
    level = 'low'
    reasons.push('Capped at Low: no independent, non-community source yet.')
  }
  return { level, value: Math.round(value * 100) / 100, reasons }
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function computeBreakoutScore(signal: Signal): BreakoutScore {
  const momentum = momentumFactor(signal)
  const factors: FactorResult[] = [
    assessedFactor('novelty', signal),
    assessedFactor('technicalSignificance', signal),
    assessedFactor('developerRelevance', signal),
    adoptionFactor(signal),
    momentum.factor,
    credibilityFactor(signal.sources),
    confirmationFactor(signal.sources),
    evidenceFactor(signal),
    timeFactor(signal),
  ]
  const evidencePoints = factors.find((f) => f.id === 'evidenceStrength')!.points
  const hypePenalty = computeHypePenalty(signal, evidencePoints)
  const raw = factors.reduce((s, f) => s + f.points, 0) + hypePenalty.points
  const total = Math.round(clamp(raw, 0, 100))
  const band =
    total >= BAND_THRESHOLDS.breakout
      ? 'breakout-candidate'
      : total >= BAND_THRESHOLDS.strong
        ? 'strong'
        : total >= BAND_THRESHOLDS.watching
          ? 'watching'
          : 'weak'
  return {
    total,
    band,
    factors,
    hypePenalty,
    confidence: computeConfidence(signal, factors, hypePenalty.points),
    momentumRatio: momentum.ratio,
    modelVersion: SCORE_MODEL_VERSION,
  }
}

/** Developer impact label derived from the assessed developer-relevance rubric. */
export function developerImpact(signal: Signal): 'high' | 'medium' | 'low' | 'unknown' {
  const level = signal.scoreInputs.assessed.developerRelevance.level
  if (level === null) return 'unknown'
  return level >= 3 ? 'high' : level === 2 ? 'medium' : 'low'
}
