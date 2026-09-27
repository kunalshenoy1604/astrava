import { describe, expect, it } from 'vitest'
import { canonicalizeUrl, refsFromUrl, weekStart } from '@/lib/pipeline/util'
import { parseFeed } from '@/lib/pipeline/feed-parser'
import { buildSeries, classifyTopics, dedupe, resolveEntities } from '@/lib/pipeline/stages'
import { runPipeline } from '@/lib/pipeline/run'
import { MemoryPipelineStore } from '@/lib/pipeline/store'
import { ALL_ADAPTERS } from '@/lib/pipeline/sources'
import { validateSignal } from '@/lib/domain/validate'
import type { NormalizedEvent } from '@/lib/pipeline/types'

const ARXIV_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2609.01234v2</id>
    <published>2026-09-26T17:00:00Z</published>
    <updated>2026-09-26T17:00:00Z</updated>
    <title>Speculative Agents: Tool Calling &amp; Sandboxed Execution</title>
    <summary>We present an agent runtime. Code: https://github.com/acme/specagent.</summary>
    <author><name>Ada Lovelace</name></author>
    <author><name>Alan Turing</name></author>
    <link href="http://arxiv.org/abs/2609.01234v2" rel="alternate" type="text/html"/>
    <category term="cs.AI"/>
  </entry>
</feed>`

function fixtureFetch(): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })
    if (url.host === 'api.github.com')
      return json({
        items: [
          {
            id: 42,
            full_name: 'acme/specagent',
            html_url: 'https://github.com/acme/specagent',
            description: 'A sandboxed agent runtime for tool calling',
            stargazers_count: 950,
            forks_count: 40,
            open_issues_count: 3,
            language: 'Rust',
            topics: ['ai-agents', 'sandbox'],
            created_at: '2026-09-01T00:00:00Z',
            pushed_at: '2026-09-26T00:00:00Z',
            homepage: null,
            owner: { login: 'acme' },
            license: null,
          },
        ],
      })
    if (url.host === 'export.arxiv.org') return new Response(ARXIV_XML, { status: 200 })
    if (url.host === 'hn.algolia.com')
      return json({
        hits: [
          { objectID: '9001', title: 'Show HN: SpecAgent – sandboxed tool calls', url: 'https://github.com/acme/specagent?utm_source=hn', points: 310, num_comments: 120, created_at: '2026-09-26T09:00:00Z', author: 'x' },
          { objectID: '9002', title: 'Unrelated blog post', url: 'https://blog.example.com/post', points: 25, num_comments: 3, created_at: '2026-09-26T10:00:00Z', author: 'y' },
        ],
      })
    if (url.host === 'huggingface.co') return new Response('rate limited', { status: 429 })
    return json({ objects: [] })
  }) as typeof fetch
}

describe('pipeline utilities', () => {
  it('canonicalises URLs for deduplication', () => {
    expect(canonicalizeUrl('http://www.GitHub.com/acme/x/?utm_source=hn#readme')).toBe('https://github.com/acme/x')
    expect(canonicalizeUrl('https://arxiv.org/pdf/2609.01234v3.pdf')).toBe('https://arxiv.org/abs/2609.01234')
  })
  it('extracts entity references', () => {
    expect(refsFromUrl('https://github.com/Acme/SpecAgent/issues/1')).toEqual(['github:acme/specagent'])
    expect(refsFromUrl('https://www.npmjs.com/package/@scope/pkg')).toEqual(['npm:@scope/pkg'])
    expect(refsFromUrl('https://huggingface.co/datasets/x/y')).toEqual([])
  })
  it('computes ISO week starts (Monday)', () => {
    expect(weekStart('2026-09-27')).toBe('2026-09-21')
  })
  it('parses Atom entries', () => {
    const [e] = parseFeed(ARXIV_XML)
    expect(e!.title).toBe('Speculative Agents: Tool Calling & Sandboxed Execution')
    expect(e!.authors).toEqual(['Ada Lovelace', 'Alan Turing'])
    expect(e!.categories).toEqual(['cs.AI'])
  })
  it('parses RSS items', () => {
    const [e] = parseFeed('<rss><channel><item><title>Release 2.0</title><link>https://example.com/r2</link><pubDate>Sat, 26 Sep 2026 10:00:00 GMT</pubDate><description><![CDATA[<p>Notes</p>]]></description></item></channel></rss>')
    expect(e).toMatchObject({ title: 'Release 2.0', link: 'https://example.com/r2', summary: 'Notes' })
  })
})

describe('pipeline stages', () => {
  const ev = (over: Partial<NormalizedEvent>): NormalizedEvent => ({
    source: 's', externalId: '1', dedupeKey: 's:1', url: 'https://a.example/x', canonicalUrl: 'https://a.example/x', title: 't', summary: '',
    occurredAt: '2026-09-26T00:00:00Z', kind: 'discussion', tier: 'community', publisher: 'p', independent: true, refs: [], text: '', metrics: [], ...over,
  })

  it('drops stored and in-batch duplicates', () => {
    const { fresh, duplicates } = dedupe([ev({}), ev({}), ev({ dedupeKey: 's:2', canonicalUrl: 'https://a.example/y', url: 'https://a.example/y' }), ev({ dedupeKey: 's:3', url: 'javascript:alert(1)', canonicalUrl: 'x' })], new Set(['s:2']))
    expect(fresh).toHaveLength(1)
    expect(duplicates).toBe(3)
  })

  it('joins events that share references (transitively)', () => {
    const clusters = resolveEntities([
      ev({ dedupeKey: 'a', refs: ['npm:pkg', 'github:o/r'] }),
      ev({ dedupeKey: 'b', refs: ['github:o/r'] }),
      ev({ dedupeKey: 'c', refs: ['arxiv:1', 'github:o/r'] }),
      ev({ dedupeKey: 'd', refs: [], canonicalUrl: 'https://z.example' }),
    ])
    expect(clusters).toHaveLength(2)
    expect(clusters.find((c) => c.events.length === 3)!.key).toBe('github:o/r')
  })

  it('differences cumulative metrics and omits windows without history', () => {
    const asOf = new Date('2026-09-27T00:00:00Z')
    const obs = [
      { id: 'stars', label: 'Stars (total)', unit: 'stars', value: 100, on: '2026-09-13', aggregation: 'cumulative' as const },
      { id: 'stars', label: 'Stars (total)', unit: 'stars', value: 150, on: '2026-09-20', aggregation: 'cumulative' as const },
      { id: 'stars', label: 'Stars (total)', unit: 'stars', value: 400, on: '2026-09-27', aggregation: 'cumulative' as const },
    ]
    const [s] = buildSeries(obs, asOf)
    expect(s!.points.map((p) => p.value)).toEqual([50, 250])
    expect(s!.provenance).toBe('measured')
  })

  it('sums periodic metrics per window', () => {
    const asOf = new Date('2026-09-27T00:00:00Z')
    const obs = ['2026-09-26', '2026-09-25', '2026-09-18'].map((on, i) => ({ id: 'dl', label: 'downloads', unit: 'd', value: [10, 20, 5][i]!, on, aggregation: 'periodic' as const }))
    expect(buildSeries(obs, asOf)[0]!.points.map((p) => p.value)).toEqual([5, 30])
  })

  it('classifies topics from text', () => {
    const r = classifyTopics('A sandboxed agent runtime for tool calling with security isolation', ['github'])
    expect(r.topics).toEqual(expect.arrayContaining(['ai-agents', 'cybersecurity', 'open-source']))
  })
})

describe('runPipeline (fixtures, in-memory store)', () => {
  it('produces validated, sourced signals and isolates failing sources', async () => {
    const store = new MemoryPipelineStore()
    const adapters = ALL_ADAPTERS.filter((a) => ['github', 'arxiv', 'hackernews', 'huggingface'].includes(a.id))
    const result = await runPipeline({ adapters, store, env: {}, now: new Date('2026-09-27T12:00:00Z'), fetchImpl: fixtureFetch(), log: () => {} })

    expect(result.status).toBe('partial')
    expect(result.stats.errors.huggingface).toContain('429')
    expect(result.stats.fetched.github).toBe(1)
    expect(result.stats.stored).toBe(1) // the repo+paper+HN cluster; the lone blog post stays below threshold

    const { signal, score } = [...store.signals.values()][0]!
    expect(signal.slug).toBe('github-acme-specagent')
    expect(validateSignal(signal)).toEqual([])
    expect(signal.isDemo).toBe(false)
    expect(signal.sources.map((s) => s.kind).sort()).toEqual(['discussion', 'github', 'paper'])
    expect(signal.sources.every((s) => !s.isPlaceholder)).toBe(true)
    // Every fact cites a source; unknowns are left empty for "Insufficient evidence".
    expect(signal.whatHappened.every((st) => st.kind === 'fact' && st.sourceIds!.length > 0)).toBe(true)
    expect(signal.architecture).toBeNull()
    expect(signal.difficulty).toBeNull()
    expect(signal.scoreInputs.assessed.technicalSignificance.level).toBeNull()
    // No history yet → momentum is insufficient, not invented.
    expect(score.factors.find((f) => f.id === 'communityMomentum')!.insufficient).toBe(true)
    expect(score.confidence.level).toBe('low')

    // Second run: same data is deduplicated, existing signal kept.
    const again = await runPipeline({ adapters, store, env: {}, now: new Date('2026-09-27T13:00:00Z'), fetchImpl: fixtureFetch(), log: () => {} })
    expect(again.stats.duplicates).toBeGreaterThan(0)
    expect(store.signals.size).toBe(1)
  })
})
