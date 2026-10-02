/**
 * AI contextual layer.
 *
 * The model reads only the text collected from a signal's own sources and
 * returns structured JSON. Nothing it writes becomes a FACT unless it comes
 * with a verbatim quote that is found in the cited source's text (checked
 * here, in code). Unverifiable claims are dropped, not softened. Judgements
 * (who is affected, what to do) are stored as ANALYSIS and marked as
 * AI-drafted. Rubric suggestions are applied only with a verified quote,
 * capped below "exceptional", and never override a human reviewer.
 */
import { z } from 'zod'
import type { Signal, Statement, RubricLevel } from '@/lib/domain/types'
import { TOPIC_BY_SLUG } from '@/lib/demo/topics'
import { chatJson, type AiConfig } from './client'
import type { SourceText } from './context'

export const PROMPT_VERSION = 'enrich-v1'
const MAX_AI_LEVEL = 3

const str = (max: number) => z.string().transform((v) => v.trim().slice(0, max))
const quoted = z.object({ text: str(300), quote: str(400), sourceId: z.coerce.string().max(10) })
const scored = z.object({ level: z.coerce.number().int().min(0).max(4), reason: str(300).default(''), quote: str(400), sourceId: z.coerce.string().max(10) })

/** Keeps the valid items of an array and drops malformed ones, instead of rejecting the whole response. */
const lenientArray = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((items) => items.flatMap((i) => {
      const r = item.safeParse(i)
      return r.success ? [r.data as z.infer<T>] : []
    }).slice(0, max))

/**
 * Model output schema. Lenient by design: one malformed field is dropped,
 * never the whole analysis. Safety does not depend on this schema — every
 * factual claim is re-checked against the source text in applyEnrichment.
 */
export const enrichmentSchema = z.object({
  relevant: z.preprocess((v) => !(v === false || v === 'false'), z.boolean()),
  relevanceReason: z.string().max(300).catch('').default(''),
  category: z.string().max(40).optional().catch(undefined),
  title: str(120).optional().catch(undefined),
  summary: str(300).optional().catch(undefined),
  claims: lenientArray(quoted, 6).default([]),
  limitations: lenientArray(quoted, 4).default([]),
  whoIsAffected: str(300).optional().catch(undefined),
  whatCanDevelopersDo: str(300).optional().catch(undefined),
  maturity: z
    .object({
      level: z.enum(['prototype', 'experimental', 'early-production', 'production', 'unknown']).catch('unknown'),
      quote: z.string().max(400).optional(),
      sourceId: z.coerce.string().max(10).optional(),
    })
    .optional()
    .catch(undefined),
  technicalSignificance: scored.optional().catch(undefined),
  developerRelevance: scored.optional().catch(undefined),
})
export type Enrichment = z.infer<typeof enrichmentSchema>

const normalize = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

/** True when `quote` (≥ 12 chars after normalising) appears verbatim in the source text. */
export function verifyQuote(quote: string | undefined, sourceText: string | undefined): boolean {
  if (!quote || !sourceText) return false
  const q = normalize(quote).replace(/^["'“]|["'”]$/g, '').replace(/\.{3}|…/g, '').trim()
  return q.length >= 12 && normalize(sourceText).includes(q)
}

export function buildPrompt(signal: Signal, texts: SourceText[]) {
  const topics = [...TOPIC_BY_SLUG.keys()].join(', ')
  const system = [
    'You are a careful technical analyst for a developer-intelligence site. You extract facts; you do not speculate.',
    'Use ONLY the source texts provided. Every claim needs a "quote" copied character-for-character from the source text with the given sourceId (12–200 characters). If you cannot quote it, leave it out.',
    'Never invent numbers, benchmarks, users, companies or capabilities. Do not use marketing language.',
    '"relevant" is false for: spam, NSFW, piracy/cracks, lists of links with no software, personal dotfiles, homework, or anything not useful to software developers.',
    `"category" must be one of: ${topics}.`,
    'Rubric levels: 0 none, 1 low, 2 moderate, 3 high, 4 exceptional. Justify with a verbatim quote.',
    'Write in English even if the source is not in English (quotes stay in the original language).',
    'Respond with a single JSON object with keys: relevant, relevanceReason, category, title (≤ 90 chars, plain and descriptive), summary (one sentence), claims [{text, quote, sourceId}] (what it is and what changed, ≤ 5), limitations [{text, quote, sourceId}], whoIsAffected, whatCanDevelopersDo, maturity {level, quote, sourceId}, technicalSignificance {level, reason, quote, sourceId}, developerRelevance {level, reason, quote, sourceId}.',
  ].join('\n')
  const user = [
    `Subject: ${signal.entities[0]?.name ?? signal.title}`,
    ...texts.map((t) => `--- sourceId: ${t.sourceId} (${t.label}) ---\n${t.text}`),
  ].join('\n\n')
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
}

export interface ApplyResult {
  signal: Signal | null // null → filtered out as irrelevant
  verified: number
  dropped: number
  reason?: string
}

/** Applies a validated enrichment to a signal, keeping only quote-verified facts. */
export function applyEnrichment(signal: Signal, e: Enrichment, texts: SourceText[], model: string, now: Date): ApplyResult {
  if (!e.relevant) return { signal: null, verified: 0, dropped: 0, reason: e.relevanceReason || 'Classified as not relevant to developers.' }
  const byId = new Map(texts.map((t) => [t.sourceId, t.text]))
  let verified = 0
  let dropped = 0

  const toFacts = (items: Enrichment['claims']): Statement[] =>
    items.flatMap((c) => {
      if (verifyQuote(c.quote, byId.get(c.sourceId))) {
        verified++
        return [{ kind: 'fact' as const, text: c.text.trim(), sourceIds: [c.sourceId], quote: c.quote.trim(), origin: 'ai' as const }]
      }
      dropped++
      return []
    })

  const claims = toFacts(e.claims)
  const limitations = toFacts(e.limitations)
  const analysis = (text: string | undefined): Statement[] => (text?.trim() ? [{ kind: 'analysis', text: text.trim(), origin: 'ai' }] : [])

  const level = (x: Enrichment['technicalSignificance'], label: string) => {
    if (!x || !verifyQuote(x.quote, byId.get(x.sourceId))) return null
    return {
      level: Math.min(x.level, MAX_AI_LEVEL) as RubricLevel,
      rationale: `AI-assisted (${model}), pending human review: ${x.reason.trim()} Evidence: “${x.quote.trim()}”`,
      label,
    }
  }
  const humanSet = (r: string, l: RubricLevel | null) => l !== null && !r.startsWith('Heuristic') && !r.startsWith('AI-assisted')
  const assessed = { ...signal.scoreInputs.assessed }
  const ts = level(e.technicalSignificance, 'technicalSignificance')
  const dr = level(e.developerRelevance, 'developerRelevance')
  if (ts && !humanSet(assessed.technicalSignificance.rationale, assessed.technicalSignificance.level))
    assessed.technicalSignificance = { level: ts.level, rationale: ts.rationale }
  if (dr && !humanSet(assessed.developerRelevance.rationale, assessed.developerRelevance.level))
    assessed.developerRelevance = { level: dr.level, rationale: dr.rationale }

  const category = e.category && TOPIC_BY_SLUG.has(e.category) ? e.category : signal.primaryTopic
  const maturityVerified = e.maturity && e.maturity.level !== 'unknown' && verifyQuote(e.maturity.quote, byId.get(e.maturity.sourceId ?? ''))
  const readinessMap = { prototype: 'not-ready', experimental: 'experimental', 'early-production': 'early-production', production: 'production-ready', unknown: 'unknown' } as const
  const entityName = signal.entities[0]?.name.split('/').pop()
  const aiTitle = e.title?.trim()

  const next: Signal = {
    ...signal,
    title: aiTitle && aiTitle.length >= 8 ? (entityName && !aiTitle.toLowerCase().includes(entityName.toLowerCase()) ? `${entityName}: ${aiTitle}` : aiTitle).slice(0, 170) : signal.title,
    dek: e.summary?.trim() && e.summary.trim().length >= 8 ? `${e.summary.trim()} ${signal.dek}`.slice(0, 318) : signal.dek,
    primaryTopic: category,
    topics: signal.topics.includes(category) ? signal.topics : [category, ...signal.topics],
    whatHappened: [...claims, ...signal.whatHappened],
    technicalChange: claims.length ? claims : signal.technicalChange,
    whyItMatters: [...analysis(e.whatCanDevelopersDo), ...signal.whyItMatters],
    risks: [...limitations, ...signal.risks],
    shouldCare: {
      ...signal.shouldCare,
      whatChanged: claims.length ? claims.slice(0, 2) : signal.shouldCare.whatChanged,
      whoIsAffected: analysis(e.whoIsAffected).length ? analysis(e.whoIsAffected) : signal.shouldCare.whoIsAffected,
      whatCanDevelopersDo: analysis(e.whatCanDevelopersDo).length ? analysis(e.whatCanDevelopersDo) : signal.shouldCare.whatCanDevelopersDo,
      productionReadiness: maturityVerified
        ? {
            level: readinessMap[e.maturity!.level],
            statement: { kind: 'fact', text: `The source describes its maturity as: ${e.maturity!.level.replace('-', ' ')}.`, sourceIds: [e.maturity!.sourceId!], quote: e.maturity!.quote!.trim(), origin: 'ai' },
          }
        : signal.shouldCare.productionReadiness,
    },
    scoreInputs: { ...signal.scoreInputs, assessed },
    ai: { model, at: now.toISOString(), verifiedClaims: verified, droppedClaims: dropped },
  }
  return { signal: next, verified, dropped }
}

export async function requestEnrichment(config: AiConfig, signal: Signal, texts: SourceText[], fetchImpl?: typeof fetch): Promise<Enrichment> {
  const raw = await chatJson(config, buildPrompt(signal, texts), fetchImpl)
  return enrichmentSchema.parse(raw)
}
