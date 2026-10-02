/**
 * Astrava domain model.
 *
 * Every piece of generated or editorial text is a `Statement` tagged as FACT,
 * ANALYSIS or ESTIMATE. A FACT must reference at least one source id; this is
 * enforced by `validateSignal` in ./validate.ts and by the test suite.
 */

export type ClaimKind = 'fact' | 'analysis' | 'estimate'

export interface Statement {
  text: string
  kind: ClaimKind
  /** Ids of entries in `Signal.sources` that support this statement. */
  sourceIds?: string[]
  /** Verbatim excerpt from the cited source that supports the statement (verified by string match). */
  quote?: string
  /** 'ai' when drafted by the AI contextual layer rather than a template or a person. */
  origin?: 'ai'
}

export type SourceKind =
  | 'official'
  | 'github'
  | 'paper'
  | 'documentation'
  | 'discussion'
  | 'benchmark'
  | 'news'

/**
 * primary   – published by the people who built the thing (release notes, repo, paper)
 * secondary – independent reporting, third-party benchmarks, reviews
 * community – forum threads, social discussion, issue comments
 */
export type SourceTier = 'primary' | 'secondary' | 'community'

export interface Source {
  id: string
  kind: SourceKind
  tier: SourceTier
  title: string
  publisher: string
  url: string
  publishedAt?: string
  retrievedAt: string
  /** True when the publisher is independent of the project's authors. */
  independent: boolean
  /** Demo placeholder URLs (example.org) are flagged so the UI never passes them off as real. */
  isPlaceholder?: boolean
  note?: string
}

export type SignalStatus =
  | 'early-signal'
  | 'emerging'
  | 'accelerating'
  | 'establishing'
  | 'cooling'
  | 'unconfirmed'

export type TimeToImpact = '0-3m' | '3-6m' | '6-12m' | '12-24m' | '24m+' | 'unknown'

export type ArchitectureLayerId =
  | 'user'
  | 'application'
  | 'model'
  | 'retrieval'
  | 'tools'
  | 'database'
  | 'infrastructure'
  | 'hardware'
  | 'network'
  | 'security'

export interface ArchitectureLayer {
  id: ArchitectureLayerId
  label: string
  detail: string
  /** changed = where the development happens; affected = downstream layers; context = unchanged */
  role: 'changed' | 'affected' | 'context'
}

export interface Architecture {
  caption: string
  layers: ArchitectureLayer[]
  note?: Statement
}

export type Stars = 1 | 2 | 3 | 4 | 5

export interface Difficulty {
  overall: Stars
  setup: Stars
  conceptual: Stars
  production: Stars
  infrastructure: Stars
  rationale: string
}

export type ProductionReadiness =
  | 'not-ready'
  | 'experimental'
  | 'early-production'
  | 'production-ready'
  | 'unknown'

export interface ShouldCare {
  whatChanged: Statement[]
  whoIsAffected: Statement[]
  whatCanDevelopersDo: Statement[]
  productionReadiness: { level: ProductionReadiness; statement: Statement }
  whatWouldMakeItImportant: Statement[]
  whatCouldPreventAdoption: Statement[]
}

export interface MetricPoint {
  date: string // ISO date (week start)
  value: number
}

export interface MetricSeries {
  id: string
  label: string
  unit: string
  /** Source the numbers were read from, when measured. */
  sourceId?: string
  /** demo = illustrative values in the demo dataset; measured = collected by the pipeline. */
  provenance: 'demo' | 'measured'
  /** Latest-period volume below which momentum is dampened (default 20). Low for rare events such as advisories. */
  minVolume?: number
  points: MetricPoint[]
}

export interface TimelineEvent {
  date: string
  label: string
  kind: 'first-seen' | 'release' | 'paper' | 'integration' | 'benchmark' | 'discussion' | 'incident'
  sourceIds: string[]
}

export interface AdoptionSignal {
  label: string
  /** null → rendered as "Insufficient evidence" */
  value: string | null
  sourceIds: string[]
  kind: ClaimKind
}

export interface CompetingApproach {
  name: string
  relation: 'alternative' | 'complement' | 'incumbent'
  note: Statement
}

export interface Builder {
  name: string
  kind: 'project' | 'company' | 'research-group' | 'community'
  note: Statement
}

export type EntityKind = 'technology' | 'company' | 'paper' | 'repository' | 'organization' | 'standard'

export interface EntityRef {
  slug: string
  name: string
  kind: EntityKind
}

/* ------------------------------------------------------------------ */
/* Scoring inputs                                                      */
/* ------------------------------------------------------------------ */

export type RubricLevel = 0 | 1 | 2 | 3 | 4

export interface AssessedInput {
  level: RubricLevel | null
  rationale: string
}

export interface HypeFlag {
  reason: string
  points: 1 | 2 | 3
}

export interface ScoreInputs {
  /** Judgement-based factors. Always rendered as ANALYSIS. */
  assessed: {
    novelty: AssessedInput
    technicalSignificance: AssessedInput
    developerRelevance: AssessedInput
  }
  /** Series id used to compute community momentum. */
  momentumSeriesId?: string
  /** Series id used to compute adoption growth. */
  adoptionSeriesId?: string
  /**
   * Average attention rate since creation for recently created artifacts
   * (e.g. GitHub stars per day), measured from two API fields. Used for
   * adoption velocity when no adoption time series exists yet.
   */
  adoptionRate?: { perDay: number; label: string; sourceId?: string } | null
  /** Count of independent projects that integrated the technology, or null if unknown. */
  independentIntegrations: number | null
  /** Whether a benchmark exists that a third party has reproduced or could reproduce. */
  reproducibleBenchmark: boolean | null
  /** Whether code, weights or another runnable artifact is publicly available. */
  runnableArtifact: boolean | null
  /** Analyst-entered hype flags, applied on top of computed penalties. */
  hypeFlags?: HypeFlag[]
}

/* ------------------------------------------------------------------ */
/* Signal                                                              */
/* ------------------------------------------------------------------ */

export interface Signal {
  id: string
  slug: string
  title: string
  /** One sentence: why we are watching. */
  dek: string
  primaryTopic: string
  topics: string[]
  status: SignalStatus
  timeToImpact: TimeToImpact
  firstSeenAt: string
  updatedAt: string
  verified: boolean
  hidden: boolean
  isDemo: boolean

  whatHappened: Statement[]
  whyItMatters: Statement[]
  technicalChange: Statement[]
  architecture: Architecture | null
  developerImplications: Statement[]
  shouldCare: ShouldCare
  difficulty: Difficulty | null
  adoptionSignals: AdoptionSignal[]
  series: MetricSeries[]
  events: TimelineEvent[]
  risks: Statement[]
  competingApproaches: CompetingApproach[]
  builders: Builder[]
  entities: EntityRef[]
  sources: Source[]
  scoreInputs: ScoreInputs
  /** Present when the AI contextual layer processed this signal. */
  ai?: { model: string; at: string; verifiedClaims: number; droppedClaims: number }
}

/* ------------------------------------------------------------------ */
/* Computed score                                                      */
/* ------------------------------------------------------------------ */

export type FactorId =
  | 'novelty'
  | 'technicalSignificance'
  | 'developerRelevance'
  | 'adoptionVelocity'
  | 'communityMomentum'
  | 'sourceCredibility'
  | 'crossSourceConfirmation'
  | 'evidenceStrength'
  | 'timeToImpact'

export interface FactorResult {
  id: FactorId
  label: string
  points: number
  max: number
  /** assessed = analyst judgement; measured = computed from observable data; estimate = forward-looking */
  basis: 'assessed' | 'measured' | 'estimate'
  explanation: string
  insufficient: boolean
}

export interface BreakoutScore {
  total: number
  band: 'breakout-candidate' | 'strong' | 'watching' | 'weak'
  factors: FactorResult[]
  hypePenalty: { points: number; reasons: string[] }
  confidence: { level: 'high' | 'medium' | 'low'; value: number; reasons: string[] }
  momentumRatio: number | null
  modelVersion: string
}

/** Lightweight projection used by feeds, search and cards. */
export interface SignalSummary {
  id: string
  slug: string
  title: string
  dek: string
  primaryTopic: string
  topics: string[]
  status: SignalStatus
  timeToImpact: TimeToImpact
  firstSeenAt: string
  updatedAt: string
  verified: boolean
  isDemo: boolean
  score: number
  band: BreakoutScore['band']
  confidence: BreakoutScore['confidence']['level']
  momentumRatio: number | null
  developerImpact: 'high' | 'medium' | 'low' | 'unknown'
  sourceCount: number
  independentSourceCount: number
  sparkline: number[]
}

export interface Topic {
  slug: string
  name: string
  short: string
  description: string
  parent?: string
  related: string[]
  faqs: { q: string; a: string }[]
  emerging: string[]
}

export interface SearchResult {
  type: 'signal' | 'topic' | 'technology' | 'company' | 'paper' | 'repository' | 'organization' | 'standard'
  title: string
  href: string
  snippet: string
  meta: string[]
  score?: number
}
