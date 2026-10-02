import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Signal } from '@/lib/domain/types'
import { computeBreakoutScore } from '@/lib/scoring/model'
import { AiRateLimited, type AiConfig } from './client'
import { collectSourceText, type SourceText } from './context'
import { applyEnrichment, PROMPT_VERSION, requestEnrichment, type Enrichment } from './enrich'

export interface CachedEnrichment {
  enrichment: Enrichment
  texts: SourceText[]
}

export interface EnrichmentCache {
  get(key: string): Promise<CachedEnrichment | null>
  set(key: string, value: CachedEnrichment, model: string): Promise<void>
}

const memory = new Map<string, CachedEnrichment>()
export const memoryCache: EnrichmentCache = {
  async get(key) {
    return memory.get(key) ?? null
  },
  async set(key, value) {
    if (memory.size > 2000) memory.clear()
    memory.set(key, value)
  },
}

/** Persists enrichments in Postgres (service role) so each item is analysed at most once per week across all instances. */
export function supabaseCache(db: SupabaseClient): EnrichmentCache {
  return {
    async get(key) {
      const hit = memory.get(key)
      if (hit) return hit
      const { data } = await db.from('ai_enrichments').select('result').eq('cache_key', key).maybeSingle()
      const value = (data?.result as CachedEnrichment | undefined) ?? null
      if (value) memory.set(key, value)
      return value
    },
    async set(key, value, model) {
      memory.set(key, value)
      await db.from('ai_enrichments').upsert({ cache_key: key, model, result: value }, { onConflict: 'cache_key' })
    },
  }
}

function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = (t.getUTCDay() + 6) % 7
  t.setUTCDate(t.getUTCDate() - day + 3)
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((t.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function cacheKey(model: string, slug: string, now: Date): string {
  return createHash('sha1').update(`${PROMPT_VERSION}|${model}|${slug}|${isoWeek(now)}`).digest('hex')
}

export interface EnrichStats {
  enriched: number
  fromCache: number
  filtered: number
  verifiedClaims: number
  droppedClaims: number
  errors: number
  rateLimited: boolean
  lastError?: string
}

/** Error text safe to show publicly: no keys, tokens or URLs with credentials. */
export function sanitizeError(message: string): string {
  return message
    .replace(/\b(gsk|sk|re|sb_secret|sb_publishable)_[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/postgres(ql)?:\/\/\S+/gi, '[redacted-url]')
    .slice(0, 200)
}

export type Enricher = (signals: Signal[], now: Date) => Promise<{ signals: Signal[]; stats: EnrichStats }>

/**
 * Enriches the highest-ranked signals first, within a per-run call budget.
 * Cached results are re-applied (and re-verified against the stored source
 * text) without calling the model.
 */
export function createEnricher(opts: {
  config: AiConfig
  cache: EnrichmentCache
  fetchImpl?: typeof fetch
  githubToken?: string
  log?: (m: string) => void
}): Enricher {
  return async (signals, now) => {
    const stats: EnrichStats = { enriched: 0, fromCache: 0, filtered: 0, verifiedClaims: 0, droppedClaims: 0, errors: 0, rateLimited: false }
    const ranked = [...signals].sort((a, b) => computeBreakoutScore(b).total - computeBreakoutScore(a).total)
    let calls = 0
    const out = new Map<string, Signal | null>()
    for (const signal of ranked) {
      const key = cacheKey(opts.config.model, signal.slug, now)
      let cached = await opts.cache.get(key).catch(() => null)
      if (!cached) {
        if (stats.rateLimited || calls >= opts.config.maxPerRun) continue
        calls++
        try {
          const texts = await collectSourceText(signal, { fetchImpl: opts.fetchImpl, githubToken: opts.githubToken })
          if (texts.length === 0) continue
          const enrichment = await requestEnrichment(opts.config, signal, texts, opts.fetchImpl)
          cached = { enrichment, texts }
          await opts.cache.set(key, cached, opts.config.model).catch(() => {})
          stats.enriched++
        } catch (err) {
          if (err instanceof AiRateLimited) stats.rateLimited = true
          else stats.errors++
          stats.lastError = sanitizeError((err as Error).message)
          opts.log?.(`ai: ${signal.slug}: ${(err as Error).message}`)
          continue
        }
      } else {
        stats.fromCache++
      }
      const applied = applyEnrichment(signal, cached.enrichment, cached.texts, opts.config.model, now)
      stats.verifiedClaims += applied.verified
      stats.droppedClaims += applied.dropped
      if (!applied.signal) {
        stats.filtered++
        opts.log?.(`ai: filtered ${signal.slug}: ${applied.reason}`)
      }
      out.set(signal.slug, applied.signal)
    }
    return {
      signals: signals.flatMap((s) => {
        if (!out.has(s.slug)) return [s]
        const v = out.get(s.slug)
        return v ? [v] : []
      }),
      stats,
    }
  }
}
