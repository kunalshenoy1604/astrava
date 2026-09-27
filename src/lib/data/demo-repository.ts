import type { BreakoutScore, Signal, SignalSummary } from '@/lib/domain/types'
import { DEMO_SIGNALS, DEMO_SNAPSHOT, TOPICS } from '@/lib/demo'
import { computeBreakoutScore } from '@/lib/scoring/model'
import { sortSummaries, toSummary } from '@/lib/domain/summary'
import { searchCorpus } from '@/lib/search/rank'
import type { ListOptions, SignalRepository } from './repository'

interface Indexed {
  signal: Signal
  score: BreakoutScore
  summary: SignalSummary
}

let index: Map<string, Indexed> | null = null

function getIndex(): Map<string, Indexed> {
  if (!index) {
    index = new Map(
      DEMO_SIGNALS.filter((s) => !s.hidden).map((signal) => {
        const score = computeBreakoutScore(signal)
        return [signal.slug, { signal, score, summary: toSummary(signal, score) }]
      }),
    )
  }
  return index
}

export const demoRepository: SignalRepository = {
  mode: 'demo',

  async listSignals(options: ListOptions = {}) {
    let list = [...getIndex().values()].map((i) => i.summary)
    if (options.topics?.length) {
      const wanted = new Set(options.topics)
      list = list.filter((s) => s.topics.some((t) => wanted.has(t)))
    }
    if (options.status) list = list.filter((s) => s.status === options.status)
    list = sortSummaries(list, options.sort ?? 'score')
    return options.limit ? list.slice(0, options.limit) : list
  },

  async getSignal(slug) {
    const hit = getIndex().get(slug)
    return hit ? { signal: hit.signal, score: hit.score } : null
  },

  async getSummariesBySlugs(slugs) {
    const idx = getIndex()
    return slugs.map((s) => idx.get(s)?.summary).filter((s): s is SignalSummary => Boolean(s))
  },

  async listSlugs() {
    return [...getIndex().values()].map((i) => ({ slug: i.signal.slug, updatedAt: i.signal.updatedAt }))
  },

  async search(query) {
    const idx = getIndex()
    return searchCorpus(query, {
      signals: [...idx.values()].map((i) => i.signal),
      summaries: new Map([...idx.values()].map((i) => [i.signal.slug, i.summary])),
      topics: TOPICS,
    })
  },

  async status() {
    return {
      mode: 'demo',
      signalCount: getIndex().size,
      lastUpdated: DEMO_SNAPSHOT,
      lastPipelineRun: null,
    }
  },
}
