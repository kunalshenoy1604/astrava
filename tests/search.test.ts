import { describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/data/demo-repository'
import { hit } from '@/lib/security/rate-limit'

describe('demo search', () => {
  it('finds signals by entity and title terms', async () => {
    const r = await demoRepository.search('sandbox')
    expect(r[0]?.type).toBe('signal')
    expect(r[0]?.href).toContain('cinder')
  })
  it('finds topics, papers and projects', async () => {
    expect((await demoRepository.search('robotics')).some((r) => r.type === 'topic')).toBe(true)
    expect((await demoRepository.search('preprint')).some((r) => r.type === 'paper')).toBe(true)
    expect((await demoRepository.search('kiln')).some((r) => r.type === 'repository')).toBe(true)
  })
  it('uses AND semantics and supports prefixes', async () => {
    expect(await demoRepository.search('tallow quantum')).toEqual([])
    expect((await demoRepository.search('infer')).length).toBeGreaterThan(0)
  })
  it('returns nothing for empty queries', async () => {
    expect(await demoRepository.search('  ')).toEqual([])
  })
})

describe('feed filters', () => {
  it('filters by topic and sorts by score', async () => {
    const list = await demoRepository.listSignals({ topics: ['robotics'] })
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((s) => s.topics.includes('robotics'))).toBe(true)
    const all = await demoRepository.listSignals()
    expect(all.map((s) => s.score)).toEqual([...all.map((s) => s.score)].sort((a, b) => b - a))
  })
})

describe('rate limiter', () => {
  it('blocks after the limit and resets after the window', () => {
    const rule = { limit: 2, windowMs: 1000 }
    expect(hit('t', rule, 0).allowed).toBe(true)
    expect(hit('t', rule, 1).allowed).toBe(true)
    expect(hit('t', rule, 2).allowed).toBe(false)
    expect(hit('t', rule, 1001).allowed).toBe(true)
  })
})
