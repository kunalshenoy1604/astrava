import type { BreakoutScore, Signal, SignalSummary } from '@/lib/domain/types'
import { TOPICS } from '@/lib/demo/topics'
import { sortSummaries, toSummary } from '@/lib/domain/summary'
import { searchCorpus } from '@/lib/search/rank'
import type { DatasetStatus, ListOptions, SignalRepository } from './repository'

export interface Indexed {
  signal: Signal
  score: BreakoutScore
  summary: SignalSummary
}

export function indexSignals(entries: { signal: Signal; score: BreakoutScore }[]): Map<string, Indexed> {
  return new Map(entries.filter((e) => !e.signal.hidden).map(({ signal, score }) => [signal.slug, { signal, score, summary: toSummary(signal, score) }]))
}

/** Read-side repository over an in-memory set of signals (demo dataset or a live snapshot). */
export function createMemoryRepository(
  mode: SignalRepository['mode'],
  load: () => Promise<Map<string, Indexed>>,
  status: (index: Map<string, Indexed>) => DatasetStatus,
): SignalRepository {
  return {
    mode,
    async listSignals(options: ListOptions = {}) {
      let list = [...(await load()).values()].map((i) => i.summary)
      if (options.topics?.length) {
        const wanted = new Set(options.topics)
        list = list.filter((s) => s.topics.some((t) => wanted.has(t)))
      }
      if (options.status) list = list.filter((s) => s.status === options.status)
      list = sortSummaries(list, options.sort ?? 'score')
      return options.limit ? list.slice(0, options.limit) : list
    },
    async getSignal(slug) {
      const hit = (await load()).get(slug)
      return hit ? { signal: hit.signal, score: hit.score } : null
    },
    async getSummariesBySlugs(slugs) {
      const idx = await load()
      return slugs.map((s) => idx.get(s)?.summary).filter((s): s is SignalSummary => Boolean(s))
    },
    async listSlugs() {
      return [...(await load()).values()].map((i) => ({ slug: i.signal.slug, updatedAt: i.signal.updatedAt }))
    },
    async search(query) {
      const idx = await load()
      return searchCorpus(query, {
        signals: [...idx.values()].map((i) => i.signal),
        summaries: new Map([...idx.values()].map((i) => [i.signal.slug, i.summary])),
        topics: TOPICS,
      })
    },
    async status() {
      return status(await load())
    },
  }
}
