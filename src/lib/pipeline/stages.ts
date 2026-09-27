/**
 * Pure pipeline stages. No I/O here, so every step is unit-testable.
 */
import type { EntityCluster, Metric, NormalizedEvent } from './types'
import type { MetricSeries } from '@/lib/domain/types'
import { isoDate } from './util'
import { isSafeHttpUrl } from '@/lib/security/url'

/* ------------------------------------------------------------------ */
/* Deduplication                                                       */
/* ------------------------------------------------------------------ */

/**
 * Drops events already stored (by dedupe key) and collapses events in this
 * batch that share a dedupe key or a canonical URL from the same source.
 */
export function dedupe(events: NormalizedEvent[], alreadyStored: Set<string>): { fresh: NormalizedEvent[]; duplicates: number } {
  const seenKeys = new Set<string>()
  const seenUrls = new Set<string>()
  const fresh: NormalizedEvent[] = []
  for (const e of events) {
    const urlKey = `${e.source}|${e.canonicalUrl}|${e.occurredAt.slice(0, 10)}`
    if (alreadyStored.has(e.dedupeKey) || seenKeys.has(e.dedupeKey) || seenUrls.has(urlKey)) continue
    if (!isSafeHttpUrl(e.url)) continue
    seenKeys.add(e.dedupeKey)
    seenUrls.add(urlKey)
    fresh.push(e)
  }
  return { fresh, duplicates: events.length - fresh.length }
}

/* ------------------------------------------------------------------ */
/* Entity resolution                                                   */
/* ------------------------------------------------------------------ */

const REF_PRIORITY = ['github:', 'hf:', 'npm:', 'arxiv:', 'url:']

function primaryRef(refs: string[]): string {
  for (const prefix of REF_PRIORITY) {
    const hit = refs.filter((r) => r.startsWith(prefix)).sort()[0]
    if (hit) return hit
  }
  return refs.sort()[0]!
}

/**
 * Union-find over shared references: an HN thread linking to a GitHub repo,
 * an npm package whose repository field points to it, and an arXiv abstract
 * that mentions its code URL all resolve to one entity.
 */
export function resolveEntities(events: NormalizedEvent[]): EntityCluster[] {
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    let root = x
    while (parent.get(root) !== root) root = parent.get(root)!
    let cur = x
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!
      parent.set(cur, root)
      cur = next
    }
    return root
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(rb, ra)
  }
  const eventRefs = events.map((e) => (e.refs.length ? e.refs : [`url:${e.canonicalUrl}`]))
  for (const refs of eventRefs) for (const r of refs) if (!parent.has(r)) parent.set(r, r)
  for (const refs of eventRefs) for (let i = 1; i < refs.length; i++) union(refs[0]!, refs[i]!)

  const groups = new Map<string, { refs: Set<string>; events: NormalizedEvent[] }>()
  events.forEach((e, i) => {
    const root = find(eventRefs[i]![0]!)
    const g = groups.get(root) ?? { refs: new Set<string>(), events: [] }
    eventRefs[i]!.forEach((r) => g.refs.add(r))
    g.events.push(e)
    groups.set(root, g)
  })

  return [...groups.values()].map((g) => {
    const key = primaryRef([...g.refs])
    const [prefix, ...rest] = key.split(':')
    const id = rest.join(':')
    const paper = g.events.find((e) => e.kind === 'paper')
    const name =
      prefix === 'arxiv' && paper
        ? paper.title
        : prefix === 'url'
          ? (g.events[0]!.title.replace(/^(Hacker News: )?(Show HN|Launch HN|Ask HN):\s*/i, '').replace(/^Hacker News:\s*/, '') || id)
          : id
    const kind: EntityCluster['kind'] = prefix === 'github' || prefix === 'npm' || prefix === 'hf' ? 'repository' : prefix === 'arxiv' ? 'paper' : 'technology'
    return { key, name, kind, events: g.events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)) }
  })
}

/* ------------------------------------------------------------------ */
/* Topic classification                                                */
/* ------------------------------------------------------------------ */

export const TOPIC_KEYWORDS: Record<string, RegExp> = {
  'ai-agents': /\b(ai agents?|llm agents?|coding agents?|agentic|tool[- ]calling|mcp|model context protocol|multi-agent|autonomous agents?)\b/i,
  'foundation-models': /\b(llms?|language models?|foundation models?|pretrain(ing|ed)?|fine-?tun(e|ing|ed)|transformers?|open weights|mixture of experts|diffusion models?|gpt|claude|gemini|llama|mistral|qwen|deepseek)\b/i,
  'ai-infrastructure': /\b(inference|model serving|kv[- ]cache|quantiz(ation|ed)|vector (database|index|search)|embeddings?|triton|rag|retrieval-augmented|vllm|llama\.cpp|ollama)\b/i,
  'developer-tools': /\b(cli|ide|code editor|lsp|language server|devtools?|debugger|linter|compiler plugin|sdk|web framework|test runner|typescript|javascript|python library|npm package)\b/i,
  robotics: /\b(robot|robotics|manipulation|locomotion|sim-?to-?real|embodied|vla)\b/i,
  'quantum-computing': /\b(quantum|qubit|qiskit|post-quantum|ml-kem|error correction)\b/i,
  cybersecurity: /\b(infosec|cybersecurity|vulnerabilit(y|ies)|cve-\d+|zero-day|exploit(ed|s)?|malware|ransomware|sandbox(ed|ing)?|supply[- ]chain attack|cryptograph(y|ic)|jailbreak|prompt injection|backdoor)\b/i,
  'computing-infrastructure': /\b(linux kernel|risc-?v|wasm|webassembly|databases?|postgres(ql)?|sqlite|jit|compilers?|kubernetes|rust|gpus?|cuda|distributed systems?)\b/i,
  'open-source': /\b(open[- ]source|oss|licen[cs]e change|maintainers?)\b/i,
}

/** Number of topic-keyword hits, excluding the generic open-source topic. Used to drop off-topic clusters. */
export function relevanceHits(text: string): number {
  return Object.entries(TOPIC_KEYWORDS)
    .filter(([topic]) => topic !== 'open-source')
    .reduce((n, [, re]) => n + (text.match(new RegExp(re.source, 'gi')) ?? []).length, 0)
}

/**
 * A cluster is on-topic when it comes from a topic-filtered source (GitHub
 * search, Hugging Face, npm keyword search, arXiv categories) and matches at
 * least one keyword, or — for general sources such as Hacker News — matches
 * at least two, which keeps general news out of the feed.
 */
export function isRelevant(cluster: EntityCluster): boolean {
  const text = cluster.events.map((e) => e.text).join(' ')
  const hits = relevanceHits(text)
  const topical = cluster.events.some((e) => ['github', 'huggingface', 'npm', 'arxiv'].includes(e.source))
  return topical ? hits >= 1 : hits >= 2
}

export function classifyTopics(text: string, sourceKinds: string[]): { primary: string; topics: string[] } {
  const hits = Object.entries(TOPIC_KEYWORDS)
    .map(([topic, re]) => ({ topic, n: (text.match(new RegExp(re.source, 'gi')) ?? []).length }))
    .filter((h) => h.n > 0)
    .sort((a, b) => b.n - a.n)
  const topics = hits.map((h) => h.topic)
  if (sourceKinds.includes('github') && !topics.includes('open-source')) topics.push('open-source')
  const aiSpecific = ['ai-agents', 'foundation-models', 'ai-infrastructure']
  if (topics.some((t) => aiSpecific.includes(t)) && !topics.includes('artificial-intelligence')) topics.push('artificial-intelligence')
  const primary = topics.find((t) => t !== 'open-source' && t !== 'artificial-intelligence') ?? topics[0] ?? 'open-source'
  return { primary, topics: topics.length ? topics : ['open-source'] }
}

/* ------------------------------------------------------------------ */
/* Momentum: rolling 7-day windows                                     */
/* ------------------------------------------------------------------ */

export const WINDOW_DAYS = 7
export const WINDOW_COUNT = 8
const DAY_MS = 24 * 3600 * 1000

/**
 * Builds up to WINDOW_COUNT rolling 7-day windows ending at `asOf`.
 *  - periodic metrics (downloads per day, HN points per story) are summed per window
 *  - cumulative metrics (total stars) are differenced: last value ≤ window end
 *    minus last value ≤ window start. Windows without a prior observation are
 *    omitted rather than guessed.
 */
export function buildSeries(observations: Metric[], asOf: Date): MetricSeries[] {
  const byId = new Map<string, Metric[]>()
  for (const m of observations) byId.set(m.id, [...(byId.get(m.id) ?? []), m])
  const end = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate())
  const series: MetricSeries[] = []

  for (const [id, list] of byId) {
    const sorted = [...list].sort((a, b) => a.on.localeCompare(b.on))
    const first = sorted[0]!
    const points: { date: string; value: number }[] = []
    for (let w = WINDOW_COUNT - 1; w >= 0; w--) {
      const wEnd = end - w * WINDOW_DAYS * DAY_MS
      const wStart = wEnd - WINDOW_DAYS * DAY_MS
      if (first.aggregation === 'periodic') {
        const inWindow = sorted.filter((m) => {
          const t = Date.parse(`${m.on}T00:00:00Z`)
          return t > wStart && t <= wEnd
        })
        const earliest = Date.parse(`${first.on}T00:00:00Z`)
        if (earliest > wEnd) continue
        points.push({ date: isoDate(new Date(wEnd)), value: inWindow.reduce((s, m) => s + m.value, 0) })
      } else {
        const atEnd = [...sorted].reverse().find((m) => Date.parse(`${m.on}T00:00:00Z`) <= wEnd)
        const atStart = [...sorted].reverse().find((m) => Date.parse(`${m.on}T00:00:00Z`) <= wStart)
        if (!atEnd || !atStart) continue
        points.push({ date: isoDate(new Date(wEnd)), value: Math.max(0, atEnd.value - atStart.value) })
      }
    }
    if (points.length === 0) continue
    const cumulative = first.aggregation === 'cumulative'
    series.push({
      id,
      label: cumulative ? `${first.label.replace(/ \(total\)$/, '')} gained per 7 days` : `${first.label} per 7 days`,
      unit: first.unit,
      provenance: 'measured',
      points,
    })
  }
  return series
}

/* ------------------------------------------------------------------ */
/* Candidate threshold                                                 */
/* ------------------------------------------------------------------ */

export const CANDIDATE_RULES = {
  minDistinctSources: 2,
  minMomentumRatio: 2,
  minLatestVolume: 20,
  minStarsGained: 100,
  minDiscussionPoints: 150,
  /** A newly created repository or model with this much attention qualifies without history. */
  newArtifactMaxAgeDays: 60,
  minNewRepoStars: 150,
  minNewModelLikes: 40,
} as const

export function isCandidate(
  cluster: EntityCluster,
  series: MetricSeries[],
  momentum: (s: MetricSeries) => number | null,
  now: Date = new Date(),
): boolean {
  const sources = new Set(cluster.events.map((e) => e.source))
  if (sources.size >= CANDIDATE_RULES.minDistinctSources) return true
  for (const e of cluster.events) {
    if (!e.createdAt) continue
    const ageDays = (now.getTime() - Date.parse(e.createdAt)) / 86_400_000
    if (ageDays > CANDIDATE_RULES.newArtifactMaxAgeDays) continue
    const stars = e.metrics.find((m) => m.id === 'github_stars_total')?.value ?? 0
    const likes = e.metrics.find((m) => m.id === 'hf_likes_total')?.value ?? 0
    if (stars >= CANDIDATE_RULES.minNewRepoStars || likes >= CANDIDATE_RULES.minNewModelLikes) return true
  }
  for (const s of series) {
    const latest = s.points.at(-1)?.value ?? 0
    const ratio = momentum(s)
    if (ratio !== null && ratio >= CANDIDATE_RULES.minMomentumRatio && latest >= CANDIDATE_RULES.minLatestVolume) return true
    if (s.id === 'github_stars_total' && latest >= CANDIDATE_RULES.minStarsGained) return true
    if (s.id === 'hn_points' && latest >= CANDIDATE_RULES.minDiscussionPoints) return true
  }
  return false
}
