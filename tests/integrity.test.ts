import { describe, expect, it } from 'vitest'
import { DEMO_SIGNALS, TOPICS } from '@/lib/demo'
import { validateSignal } from '@/lib/domain/validate'
import { TOPIC_BY_SLUG } from '@/lib/demo/topics'
import { isSafeHttpUrl, safeRedirectPath } from '@/lib/security/url'
import { signalToRows, rowsToSignal } from '@/lib/data/mapping'
import { computeBreakoutScore } from '@/lib/scoring/model'

describe('demo dataset integrity (anti-fabrication rules)', () => {
  it.each(DEMO_SIGNALS.map((s) => [s.slug, s] as const))('%s has no validation issues', (_slug, s) => {
    expect(validateSignal(s)).toEqual([])
  })

  it('uses only placeholder example.org sources and demo series', () => {
    for (const s of DEMO_SIGNALS) {
      expect(s.isDemo).toBe(true)
      for (const src of s.sources) {
        expect(src.isPlaceholder).toBe(true)
        expect(new URL(src.url).hostname).toBe('example.org')
      }
      for (const series of s.series) expect(series.provenance).toBe('demo')
    }
  })

  it('has unique ids and slugs, and known topics', () => {
    expect(new Set(DEMO_SIGNALS.map((s) => s.id)).size).toBe(DEMO_SIGNALS.length)
    expect(new Set(DEMO_SIGNALS.map((s) => s.slug)).size).toBe(DEMO_SIGNALS.length)
    for (const s of DEMO_SIGNALS) {
      expect(TOPIC_BY_SLUG.has(s.primaryTopic)).toBe(true)
      for (const t of s.topics) expect(TOPIC_BY_SLUG.has(t)).toBe(true)
    }
  })

  it('covers every topic with at least one signal', () => {
    for (const t of TOPICS) expect(DEMO_SIGNALS.some((s) => s.topics.includes(t.slug))).toBe(true)
  })

  it('rejects a FACT without a source', () => {
    const s = { ...DEMO_SIGNALS[0]!, whatHappened: [{ kind: 'fact' as const, text: 'Unsourced claim.' }] }
    expect(validateSignal(s).some((i) => i.message.includes('no source'))).toBe(true)
  })

  it('round-trips through database rows without loss', () => {
    for (const s of DEMO_SIGNALS) {
      const rows = signalToRows(s, computeBreakoutScore(s))
      const back = rowsToSignal(rows.signalRow, rows.sourceRows, rows.historyRows, s.entities)
      expect(computeBreakoutScore(back)).toEqual(computeBreakoutScore(s))
      expect(back.sources).toEqual(s.sources)
    }
  })
})

describe('URL safety', () => {
  it('accepts http(s) and rejects dangerous schemes', () => {
    expect(isSafeHttpUrl('https://example.org/a')).toBe(true)
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('data:text/html,hi')).toBe(false)
    expect(isSafeHttpUrl('https://user:pw@example.org')).toBe(false)
    expect(isSafeHttpUrl('ftp://example.org')).toBe(false)
    expect(isSafeHttpUrl('https://localhost')).toBe(false)
  })
  it('only allows same-site redirect paths', () => {
    expect(safeRedirectPath('/radar')).toBe('/radar')
    expect(safeRedirectPath('//evil.com')).toBe('/')
    expect(safeRedirectPath('/\\evil.com')).toBe('/')
    expect(safeRedirectPath('https://evil.com')).toBe('/')
  })
})
