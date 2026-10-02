import { describe, expect, it } from 'vitest'
import { applyEnrichment, enrichmentSchema, verifyQuote } from '@/lib/ai/enrich'
import { cleanMarkdown } from '@/lib/ai/context'
import { createEnricher, memoryCache } from '@/lib/ai/enricher'
import { aiConfigFromEnv } from '@/lib/ai/client'
import { validateSignal } from '@/lib/domain/validate'
import type { Signal } from '@/lib/domain/types'

const README = 'SpecAgent runs every tool call in a WebAssembly sandbox with explicit capabilities. It is experimental and the API may change before 1.0.'

function baseSignal(): Signal {
  return {
    id: 'x', slug: 'github-acme-specagent', title: 'specagent: sandboxed agents', dek: 'Detected.', primaryTopic: 'open-source', topics: ['open-source'],
    status: 'unconfirmed', timeToImpact: 'unknown', firstSeenAt: '2026-09-20T00:00:00Z', updatedAt: '2026-09-27T00:00:00Z', verified: false, hidden: false, isDemo: false,
    whatHappened: [{ kind: 'fact', text: 'Repo had 900 stars.', sourceIds: ['s1'] }], whyItMatters: [], technicalChange: [], architecture: null, developerImplications: [],
    shouldCare: { whatChanged: [], whoIsAffected: [], whatCanDevelopersDo: [], productionReadiness: { level: 'unknown', statement: { kind: 'analysis', text: 'Not assessed.' } }, whatWouldMakeItImportant: [], whatCouldPreventAdoption: [] },
    difficulty: null, adoptionSignals: [], series: [], events: [], risks: [], competingApproaches: [], builders: [],
    entities: [{ slug: 'github-acme-specagent', name: 'acme/specagent', kind: 'repository' }],
    sources: [{ id: 's1', kind: 'github', tier: 'primary', title: 'acme/specagent repository', publisher: 'GitHub', url: 'https://github.com/acme/specagent', retrievedAt: '2026-09-27T00:00:00Z', independent: false }],
    scoreInputs: {
      assessed: { novelty: { level: 2, rationale: 'Heuristic (automated): new.' }, technicalSignificance: { level: null, rationale: 'Requires analyst review.' }, developerRelevance: { level: 1, rationale: 'Heuristic (automated): x' } },
      independentIntegrations: null, reproducibleBenchmark: null, runnableArtifact: true,
    },
  }
}

const texts = [{ sourceId: 's1', label: 'GitHub', text: README }]

const goodEnrichment = enrichmentSchema.parse({
  relevant: true,
  category: 'ai-agents',
  title: 'Sandboxed tool execution for AI agents',
  summary: 'An agent runtime that isolates each tool call.',
  claims: [
    { text: 'Each tool call runs in a WebAssembly sandbox with explicit capabilities.', quote: 'runs every tool call in a WebAssembly sandbox', sourceId: 's1' },
    { text: 'It is ten times faster than Docker.', quote: 'ten times faster than Docker', sourceId: 's1' },
  ],
  limitations: [{ text: 'The API is not yet stable.', quote: 'the API may change before 1.0', sourceId: 's1' }],
  whoIsAffected: 'Teams running agents that execute tools.',
  maturity: { level: 'experimental', quote: 'It is experimental', sourceId: 's1' },
  technicalSignificance: { level: 4, reason: 'Isolation per call.', quote: 'WebAssembly sandbox with explicit capabilities', sourceId: 's1' },
  developerRelevance: { level: 3, reason: 'Agent builders.', quote: 'not in the source at all', sourceId: 's1' },
})

describe('quote verification', () => {
  it('accepts verbatim excerpts (whitespace/case-insensitive) and rejects the rest', () => {
    expect(verifyQuote('runs  every tool CALL in a webassembly', README)).toBe(true)
    expect(verifyQuote('ten times faster than Docker', README)).toBe(false)
    expect(verifyQuote('SpecAgent', README)).toBe(false) // too short to be evidence
    expect(verifyQuote(undefined, README)).toBe(false)
  })
  it('cleans markdown to prose', () => {
    expect(cleanMarkdown('# Title\n![badge](x.svg) [docs](https://x) `code`\n```js\nconst a=1\n```')).toBe('Title docs code')
  })
})

describe('applyEnrichment', () => {
  it('keeps only quote-verified facts and labels AI output', () => {
    const r = applyEnrichment(baseSignal(), goodEnrichment, texts, 'test-model', new Date('2026-09-27T00:00:00Z'))
    expect(r.verified).toBe(2) // one claim + one limitation (maturity is checked separately)
    expect(r.dropped).toBe(1)
    const s = r.signal!
    expect(s.whatHappened.some((x) => x.text.includes('ten times faster'))).toBe(false)
    expect(s.whatHappened[0]).toMatchObject({ kind: 'fact', origin: 'ai', sourceIds: ['s1'] })
    expect(s.shouldCare.whoIsAffected[0]).toMatchObject({ kind: 'analysis', origin: 'ai' })
    expect(s.shouldCare.productionReadiness.level).toBe('experimental')
    expect(s.primaryTopic).toBe('ai-agents')
    expect(s.title).toBe('specagent: Sandboxed tool execution for AI agents')
    expect(validateSignal(s)).toEqual([])
  })
  it('caps AI rubric levels, requires a verified quote, and never overrides a human', () => {
    const s = applyEnrichment(baseSignal(), goodEnrichment, texts, 'm', new Date()).signal!
    expect(s.scoreInputs.assessed.technicalSignificance.level).toBe(3)
    expect(s.scoreInputs.assessed.technicalSignificance.rationale).toMatch(/^AI-assisted/)
    expect(s.scoreInputs.assessed.developerRelevance.level).toBe(1) // quote not found → unchanged
    const human = baseSignal()
    human.scoreInputs.assessed.technicalSignificance = { level: 1, rationale: 'Set by analyst review on 2026-09-20.' }
    expect(applyEnrichment(human, goodEnrichment, texts, 'm', new Date()).signal!.scoreInputs.assessed.technicalSignificance.level).toBe(1)
  })
  it('filters irrelevant items', () => {
    const r = applyEnrichment(baseSignal(), { ...goodEnrichment, relevant: false, relevanceReason: 'Personal dotfiles.' }, texts, 'm', new Date())
    expect(r.signal).toBeNull()
  })
})

describe('enricher', () => {
  it('respects the per-run budget, caches results and survives provider errors', async () => {
    let llmCalls = 0
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/readme')) return new Response(README)
      if (url.includes('/chat/completions')) {
        llmCalls++
        if (llmCalls === 3) return new Response('slow down', { status: 429 })
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(goodEnrichment) } }] }))
      }
      return new Response('', { status: 404 })
    }) as typeof fetch
    const config = aiConfigFromEnv({ GROQ_API_KEY: 'k', AI_MAX_PER_RUN: '5' })!
    expect(config.model).toBe('openai/gpt-oss-20b')
    const enrich = createEnricher({ config, cache: memoryCache, fetchImpl })
    const signals = [1, 2, 3, 4].map((i) => ({ ...baseSignal(), slug: `github-acme-spec${i}`, id: String(i) }))
    const now = new Date('2026-09-27T00:00:00Z')
    const first = await enrich(signals, now)
    expect(first.stats.enriched).toBe(2)
    expect(first.stats.rateLimited).toBe(true)
    expect(first.signals).toHaveLength(4)
    const second = await enrich(signals, now)
    expect(second.stats.fromCache).toBe(2)
  })
  it('is disabled without a key', () => {
    expect(aiConfigFromEnv({})).toBeNull()
  })
})
