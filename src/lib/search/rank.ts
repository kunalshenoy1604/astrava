/**
 * In-memory search used in demo mode (and as the reference behaviour the
 * Postgres `search_all` function mirrors). Weighted token matching with prefix
 * support; results are grouped by entity type and carry metadata.
 */
import type { SearchResult, Signal, SignalSummary, Topic } from '@/lib/domain/types'
import { SOURCE_KIND_LABEL, STATUS_LABEL } from '@/lib/domain/labels'

export const MAX_QUERY_LENGTH = 120
const MAX_RESULTS = 30

export function normalizeQuery(raw: string): string {
  return raw.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH)
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9+#.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter((t) => t.length > 1)
}

/** Score = Σ over query tokens of the best field weight that contains the token (exact > prefix). */
function scoreFields(queryTokens: string[], fields: [string, number][]): number {
  let total = 0
  for (const q of queryTokens) {
    let best = 0
    for (const [text, weight] of fields) {
      const tokens = tokenize(text)
      if (tokens.includes(q)) best = Math.max(best, weight)
      else if (tokens.some((t) => t.startsWith(q))) best = Math.max(best, weight * 0.6)
    }
    if (best === 0) return 0 // every query token must match somewhere (AND semantics)
    total += best
  }
  return total
}

export function searchCorpus(
  rawQuery: string,
  corpus: { signals: Signal[]; summaries: Map<string, SignalSummary>; topics: Topic[] },
): SearchResult[] {
  const query = normalizeQuery(rawQuery)
  const qTokens = tokenize(query)
  if (qTokens.length === 0) return []
  const results: (SearchResult & { rank: number })[] = []
  const seenEntities = new Set<string>()

  for (const signal of corpus.signals) {
    const summary = corpus.summaries.get(signal.slug)
    if (!summary) continue
    const rank = scoreFields(qTokens, [
      [signal.title, 5],
      [signal.dek, 3],
      [signal.entities.map((e) => e.name).join(' '), 4],
      [signal.topics.join(' ').replace(/-/g, ' '), 2],
      [signal.whatHappened.map((s) => s.text).join(' '), 1.5],
      [signal.builders.map((b) => b.name).join(' '), 2],
    ])
    if (rank > 0) {
      results.push({
        type: 'signal',
        title: signal.title,
        href: `/signals/${signal.slug}`,
        snippet: signal.dek,
        meta: [signal.primaryTopic.replace(/-/g, ' '), STATUS_LABEL[signal.status], `${summary.sourceCount} sources`],
        score: summary.score,
        rank: rank + summary.score / 100,
      })
    }

    for (const entity of signal.entities) {
      const key = `${entity.kind}:${entity.slug}`
      if (seenEntities.has(key)) continue
      const r = scoreFields(qTokens, [[entity.name, 5]])
      if (r > 0) {
        seenEntities.add(key)
        results.push({
          type: entity.kind === 'standard' ? 'standard' : entity.kind,
          title: entity.name,
          href: `/signals/${signal.slug}`,
          snippet: `Referenced in: ${signal.title}`,
          meta: [entity.kind, signal.primaryTopic.replace(/-/g, ' ')],
          rank: r,
        })
      }
    }

    for (const builder of signal.builders) {
      const key = `builder:${builder.name.toLowerCase()}`
      if (seenEntities.has(key)) continue
      const r = scoreFields(qTokens, [[builder.name, 4]])
      if (r > 0) {
        seenEntities.add(key)
        results.push({
          type: builder.kind === 'company' ? 'company' : builder.kind === 'research-group' ? 'organization' : 'repository',
          title: builder.name,
          href: `/signals/${signal.slug}#builders`,
          snippet: builder.note.text,
          meta: [builder.kind.replace('-', ' '), `in ${signal.title}`],
          rank: r,
        })
      }
    }

    for (const source of signal.sources) {
      if (source.kind !== 'paper' && source.kind !== 'github') continue
      const r = scoreFields(qTokens, [
        [source.title, 3],
        [source.publisher, 1],
      ])
      if (r > 0) {
        results.push({
          type: source.kind === 'paper' ? 'paper' : 'repository',
          title: source.title,
          href: `/signals/${signal.slug}#evidence`,
          snippet: `${SOURCE_KIND_LABEL[source.kind]} cited by: ${signal.title}`,
          meta: [source.publisher, source.isPlaceholder ? 'demo placeholder' : source.tier],
          rank: r * 0.8,
        })
      }
    }
  }

  for (const topic of corpus.topics) {
    const r = scoreFields(qTokens, [
      [topic.name, 5],
      [topic.short, 4],
      [topic.description, 1.5],
      [topic.emerging.join(' '), 2],
    ])
    if (r > 0) {
      results.push({
        type: 'topic',
        title: topic.name,
        href: `/topics/${topic.slug}`,
        snippet: topic.description,
        meta: ['topic'],
        rank: r + 0.5,
      })
    }
  }

  return results
    .sort((a, b) => b.rank - a.rank)
    .slice(0, MAX_RESULTS)
    .map(({ rank: _rank, ...rest }) => rest)
}
