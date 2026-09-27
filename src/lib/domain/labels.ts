import type {
  BreakoutScore,
  ClaimKind,
  ProductionReadiness,
  SignalStatus,
  SourceKind,
  SourceTier,
  TimeToImpact,
} from './types'

export const STATUS_LABEL: Record<SignalStatus, string> = {
  'early-signal': 'Early signal',
  emerging: 'Emerging',
  accelerating: 'Accelerating',
  establishing: 'Establishing',
  cooling: 'Cooling',
  unconfirmed: 'Unconfirmed',
}

export const STATUS_DESCRIPTION: Record<SignalStatus, string> = {
  'early-signal': 'First credible evidence observed; little independent confirmation yet.',
  emerging: 'Independent confirmation is appearing; adoption is still small.',
  accelerating: 'Measured activity is rising faster than its recent baseline.',
  establishing: 'Adoption is broadening; the signal is becoming common knowledge.',
  cooling: 'Measured activity has fallen below its recent baseline.',
  unconfirmed: 'Evidence is too thin to support a conclusion.',
}

export const TIME_TO_IMPACT_LABEL: Record<TimeToImpact, string> = {
  '0-3m': '0–3 months',
  '3-6m': '3–6 months',
  '6-12m': '6–12 months',
  '12-24m': '1–2 years',
  '24m+': '2+ years',
  unknown: 'Unknown',
}

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  official: 'Official source',
  github: 'GitHub',
  paper: 'Paper',
  documentation: 'Documentation',
  discussion: 'Developer discussion',
  benchmark: 'Benchmark',
  news: 'News / reporting',
}

export const SOURCE_TIER_LABEL: Record<SourceTier, string> = {
  primary: 'Primary source',
  secondary: 'Secondary source',
  community: 'Community signal',
}

export const CLAIM_LABEL: Record<ClaimKind, string> = {
  fact: 'Fact',
  analysis: 'Analysis',
  estimate: 'Estimate',
}

export const CLAIM_DESCRIPTION: Record<ClaimKind, string> = {
  fact: 'Directly supported by a cited source.',
  analysis: 'Astrava’s interpretation of the evidence.',
  estimate: 'A forward-looking judgement with uncertainty.',
}

export const BAND_LABEL: Record<BreakoutScore['band'], string> = {
  'breakout-candidate': 'Breakout candidate',
  strong: 'Strong signal',
  watching: 'Worth watching',
  weak: 'Weak or early',
}

export const CONFIDENCE_LABEL: Record<BreakoutScore['confidence']['level'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

export const READINESS_LABEL: Record<ProductionReadiness, string> = {
  'not-ready': 'Not production-ready',
  experimental: 'Experimental',
  'early-production': 'Early production use',
  'production-ready': 'Production-ready',
  unknown: 'Insufficient evidence',
}

export const STARS_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Introductory',
  2: 'Accessible',
  3: 'Intermediate',
  4: 'Demanding',
  5: 'Advanced',
}

export const INSUFFICIENT = 'Insufficient evidence'
