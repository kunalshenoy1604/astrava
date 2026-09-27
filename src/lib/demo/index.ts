import type { Signal } from '@/lib/domain/types'
import { harborPq, cinder, weightSupplyChain } from './signals/security'
import { loomwork, lumen, promptls, tracefile } from './signals/agents'
import { pgstrata, sidecarDecoding, tallow } from './signals/infrastructure'
import { keelCode, marrowVla, qubitline, sableJit } from './signals/frontier'

export { DEMO_SNAPSHOT } from './helpers'
export { TOPICS, TOPIC_BY_SLUG } from './topics'

/**
 * The demo dataset: fictional projects, placeholder sources, illustrative
 * numbers. Used whenever Supabase is not configured, and as the seed for a
 * fresh database (seeded rows keep `is_demo = true`).
 */
export const DEMO_SIGNALS: Signal[] = [
  tallow,
  loomwork,
  weightSupplyChain,
  tracefile,
  cinder,
  pgstrata,
  lumen,
  keelCode,
  harborPq,
  marrowVla,
  sableJit,
  sidecarDecoding,
  qubitline,
  promptls,
]
