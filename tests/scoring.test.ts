import { describe, expect, it } from 'vitest'
import { DEMO_SIGNALS } from '@/lib/demo'
import { computeBreakoutScore, FACTOR_WEIGHTS, momentumRatio } from '@/lib/scoring/model'
import { computeHypePenalty, HYPE_PENALTY_CAP } from '@/lib/scoring/hype'
import type { Signal } from '@/lib/domain/types'

const bySlug = (s: string) => DEMO_SIGNALS.find((x) => x.slug.startsWith(s))!

describe('Breakout Score model', () => {
  it('weights sum to 100', () => {
    expect(Object.values(FACTOR_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('is deterministic and bounded for every demo signal', () => {
    for (const s of DEMO_SIGNALS) {
      const a = computeBreakoutScore(s)
      expect(a).toEqual(computeBreakoutScore(s))
      expect(a.total).toBeGreaterThanOrEqual(0)
      expect(a.total).toBeLessThanOrEqual(100)
      for (const f of a.factors) {
        expect(f.points).toBeLessThanOrEqual(f.max)
        expect(f.explanation.length).toBeGreaterThan(10)
      }
    }
  })

  it('total equals the sum of factor points plus the hype penalty (rounded)', () => {
    for (const s of DEMO_SIGNALS) {
      const r = computeBreakoutScore(s)
      const sum = r.factors.reduce((a, f) => a + f.points, 0) + r.hypePenalty.points
      expect(r.total).toBe(Math.round(Math.min(100, Math.max(0, sum))))
    }
  })

  it('computes momentum as latest over trailing four-period mean', () => {
    const series = { id: 'x', label: 'x', unit: 'x', provenance: 'demo' as const, points: [10, 10, 10, 10, 10, 40].map((value, i) => ({ date: `2026-01-0${i + 1}`, value })) }
    expect(momentumRatio(series)).toBe(4)
    expect(momentumRatio({ ...series, points: series.points.slice(0, 2) })).toBeNull()
    expect(momentumRatio({ ...series, points: [0, 0, 0, 5].map((value, i) => ({ date: `d${i}`, value })) })).toBeNull()
  })

  it('marks missing measurements as insufficient rather than guessing', () => {
    const harbor = computeBreakoutScore(bySlug('harbor-proxy'))
    const momentum = harbor.factors.find((f) => f.id === 'communityMomentum')!
    expect(momentum.insufficient).toBe(true)
    expect(momentum.points).toBe(0)
    expect(harbor.momentumRatio).toBeNull()
  })

  it('caps confidence at low without independent substantive sources', () => {
    expect(computeBreakoutScore(bySlug('keel')).confidence.level).toBe('low')
    expect(computeBreakoutScore(bySlug('promptls')).confidence.level).toBe('low')
    expect(computeBreakoutScore(bySlug('tallow')).confidence.level).toBe('high')
  })

  it('ranks a well-evidenced signal above a hyped one', () => {
    expect(computeBreakoutScore(bySlug('tallow')).total).toBeGreaterThan(computeBreakoutScore(bySlug('keel')).total)
  })
})

describe('hype penalty', () => {
  it('penalises superlatives, vendor-only benchmarks and analyst flags', () => {
    const keel = computeBreakoutScore(bySlug('keel'))
    expect(keel.hypePenalty.points).toBeLessThan(0)
    expect(keel.hypePenalty.reasons.some((r) => r.includes('self-reported'))).toBe(true)
    expect(keel.hypePenalty.reasons.some((r) => r.includes('superlative'))).toBe(true)
  })

  it('penalises attention outpacing evidence', () => {
    const p = computeBreakoutScore(bySlug('promptls'))
    expect(p.hypePenalty.reasons.some((r) => r.includes('community sources'))).toBe(true)
  })

  it('never exceeds the cap', () => {
    const base = bySlug('keel')
    const hyped: Signal = {
      ...base,
      sources: base.sources.map((s) => ({ ...s, title: `${s.title} revolutionary breakthrough game-changer 10x` })),
      scoreInputs: { ...base.scoreInputs, hypeFlags: [{ reason: 'a', points: 3 }, { reason: 'b', points: 3 }, { reason: 'c', points: 3 }] },
    }
    expect(computeHypePenalty(hyped, 0).points).toBe(-HYPE_PENALTY_CAP)
  })

  it('does not match hype words inside other words', () => {
    const base = bySlug('tallow')
    const s: Signal = { ...base, sources: base.sources.map((x) => ({ ...x, title: 'Disruptor pattern and killerwhale dataset' })) }
    expect(computeHypePenalty(s, 10).reasons.some((r) => r.includes('superlative'))).toBe(false)
  })
})
