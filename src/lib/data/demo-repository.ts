import { DEMO_SIGNALS, DEMO_SNAPSHOT } from '@/lib/demo'
import { computeBreakoutScore } from '@/lib/scoring/model'
import { createMemoryRepository, indexSignals, type Indexed } from './memory-repository'

let index: Map<string, Indexed> | null = null

/** The fictional, clearly labelled demo dataset. Used when DATA_MODE=demo, or as a fallback if live sources fail. */
export const demoRepository = createMemoryRepository(
  'demo',
  async () => (index ??= indexSignals(DEMO_SIGNALS.map((signal) => ({ signal, score: computeBreakoutScore(signal) })))),
  (idx) => ({ mode: 'demo', signalCount: idx.size, lastUpdated: DEMO_SNAPSHOT, lastPipelineRun: null }),
)
