/**
 * Signal extraction and structured explanation.
 *
 * Every FACT produced here is a restatement of a field returned by a source
 * API, with that source attached. Nothing is inferred from a model. Where the
 * pipeline cannot know something (architecture, difficulty, production
 * readiness), it leaves the field empty so the UI shows "Insufficient
 * evidence" until an analyst fills it in.
 */
import type {
  AdoptionSignal,
  AssessedInput,
  MetricSeries,
  Signal,
  Source,
  Statement,
  TimelineEvent,
} from '@/lib/domain/types'
import type { EntityCluster, NormalizedEvent } from './types'
import { classifyTopics } from './stages'
import { slugify, truncate } from './util'
import { momentumRatio } from '@/lib/scoring/model'

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n))
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function signalSlugFor(cluster: EntityCluster): string {
  const [prefix, ...rest] = cluster.key.split(':')
  const base = prefix === 'url' ? cluster.name : `${prefix}-${rest.join('-')}`
  return slugify(base, 110) || slugify(cluster.key, 110)
}

function toSources(events: NormalizedEvent[]): { sources: Source[]; idFor: Map<NormalizedEvent, string> } {
  const byUrl = new Map<string, Source>()
  const idFor = new Map<NormalizedEvent, string>()
  let n = 0
  for (const e of events) {
    const existing = byUrl.get(e.canonicalUrl)
    if (existing) {
      idFor.set(e, existing.id)
      continue
    }
    const id = `s${++n}`
    const src: Source = {
      id,
      kind: e.kind,
      tier: e.tier,
      title: truncate(e.title, 200),
      publisher: e.publisher,
      url: e.url,
      publishedAt: e.occurredAt,
      retrievedAt: new Date().toISOString(),
      independent: e.independent,
      ...(e.summary ? { note: truncate(e.summary, 280) } : {}),
    }
    byUrl.set(e.canonicalUrl, src)
    idFor.set(e, id)
  }
  return { sources: [...byUrl.values()], idFor }
}

/** Automated rubric. Deliberately conservative and always labelled as heuristic. */
export function heuristicAssessment(cluster: EntityCluster, topics: string[], now: Date) {
  const created = cluster.events.map((e) => e.createdAt).filter(Boolean).sort()[0]
  const ageDays = created ? (now.getTime() - Date.parse(created)) / 86_400_000 : null
  const novelty: AssessedInput =
    ageDays === null
      ? { level: null, rationale: 'Creation date unknown.' }
      : ageDays <= 90
        ? { level: 2, rationale: `Heuristic (automated): first published ${Math.round(ageDays)} days ago.` }
        : { level: 1, rationale: `Heuristic (automated): exists for ${Math.round(ageDays)} days; activity is new, the project is not.` }
  const hasPackage = cluster.events.some((e) => e.source === 'npm' || e.source === 'huggingface')
  const devTopic = topics.some((t) => ['developer-tools', 'ai-agents', 'ai-infrastructure'].includes(t))
  const developerRelevance: AssessedInput = {
    level: hasPackage && devTopic ? 2 : 1,
    rationale: `Heuristic (automated): ${hasPackage ? 'installable package or model available' : 'no installable package detected'}; ${devTopic ? 'developer-facing topic' : 'topic is not primarily developer-facing'}.`,
  }
  const technicalSignificance: AssessedInput = { level: null, rationale: 'Requires analyst review; not assessed automatically.' }
  return { novelty, technicalSignificance, developerRelevance }
}

export function extractSignal(cluster: EntityCluster, series: MetricSeries[], now: Date, id: string): Signal {
  const { sources, idFor } = toSources(cluster.events)
  const sid = (e: NormalizedEvent) => idFor.get(e)!
  const text = cluster.events.map((e) => e.text).join(' ')
  const { primary, topics } = classifyTopics(text, cluster.events.map((e) => e.kind))

  const repo = [...cluster.events].reverse().find((e) => e.source === 'github')
  const paper = cluster.events.find((e) => e.kind === 'paper')
  const hn = cluster.events.filter((e) => e.source === 'hackernews')
  const npm = [...cluster.events].reverse().find((e) => e.source === 'npm')
  const hf = [...cluster.events].reverse().find((e) => e.source === 'huggingface')
  const official = cluster.events.filter((e) => e.source === 'rss')

  const facts: Statement[] = []
  if (repo) {
    const stars = repo.metrics.find((m) => m.id === 'github_stars_total')?.value
    facts.push({
      kind: 'fact',
      sourceIds: [sid(repo)],
      text: `The GitHub repository ${cluster.name} ${repo.createdAt ? `was created on ${dateLabel(repo.createdAt)} and ` : ''}had ${fmt(stars ?? 0)} stars on ${dateLabel(repo.occurredAt)}.`,
    })
    if (repo.summary) facts.push({ kind: 'fact', sourceIds: [sid(repo)], text: `Its description reads: “${repo.summary}”` })
  }
  if (paper) facts.push({ kind: 'fact', sourceIds: [sid(paper)], text: `A paper titled “${paper.title}” was posted to arXiv on ${dateLabel(paper.occurredAt)}.` })
  if (hf) facts.push({ kind: 'fact', sourceIds: [sid(hf)], text: `${hf.title} is listed among trending models on the Hugging Face Hub.` })
  if (npm) {
    const s = series.find((x) => x.id === 'npm_downloads')
    const latest = s?.points.at(-1)?.value
    facts.push({
      kind: 'fact',
      sourceIds: [sid(npm)],
      text: latest !== undefined ? `The npm package recorded ${fmt(latest)} downloads in the latest 7-day window.` : `A package is published on npm: ${npm.title}.`,
    })
  }
  for (const o of official.slice(0, 3)) facts.push({ kind: 'fact', sourceIds: [sid(o)], text: `${o.publisher} published “${o.title}” on ${dateLabel(o.occurredAt)}.` })
  if (hn.length) {
    const points = hn.reduce((s, e) => s + (e.metrics.find((m) => m.id === 'hn_points')?.value ?? 0), 0)
    facts.push({
      kind: 'fact',
      sourceIds: [...new Set(hn.map(sid))],
      text: `Discussed in ${hn.length} Hacker News thread${hn.length === 1 ? '' : 's'} with ${fmt(points)} combined points.`,
    })
  }

  const momentumSeries =
    series.find((s) => s.id === 'github_stars_total') ?? series.find((s) => s.id === 'npm_downloads') ?? series.find((s) => s.id === 'hn_points')
  const ratio = momentumRatio(momentumSeries)
  const adoptionSeries = series.find((s) => s.id === 'npm_downloads') ?? series.find((s) => s.id === 'github_forks_total')

  const rawTitle = truncate(repo ? `${cluster.name}${repo.summary ? ` — ${repo.summary}` : ''}` : paper ? paper.title : cluster.name, 170).trim()
  const title = rawTitle.length >= 8 ? rawTitle : `${rawTitle} (automated signal)`
  const dek = truncate(
    [
      momentumSeries && ratio !== null
        ? `${momentumSeries.label}: ${fmt(momentumSeries.points.at(-1)!.value)} in the latest window (${ratio.toFixed(1)}× the prior mean).`
        : null,
      `${sources.length} source${sources.length === 1 ? '' : 's'} across ${new Set(cluster.events.map((e) => e.source)).size} channel${new Set(cluster.events.map((e) => e.source)).size === 1 ? '' : 's'}. Automatically detected; not yet reviewed.`,
    ]
      .filter(Boolean)
      .join(' '),
    300,
  )

  const adoptionSignals: AdoptionSignal[] = series.map((s) => {
    const r = momentumRatio(s)
    const sourceEvent = cluster.events.find((e) => e.metrics.some((m) => m.id === s.id))
    return {
      label: `${s.label}, latest window`,
      value: `${fmt(s.points.at(-1)!.value)}${r !== null ? ` (${r.toFixed(1)}× prior mean)` : ''}`,
      sourceIds: sourceEvent ? [sid(sourceEvent)] : [],
      kind: sourceEvent ? 'fact' : 'analysis',
    }
  })

  const events: TimelineEvent[] = cluster.events
    .filter((e) => e.source !== 'github' && e.source !== 'huggingface' && e.source !== 'npm')
    .map((e) => ({
      date: e.occurredAt,
      label: truncate(e.title, 120),
      kind: e.kind === 'paper' ? 'paper' : e.kind === 'discussion' ? 'discussion' : 'release',
      sourceIds: [sid(e)],
    }))
  events.unshift({ date: cluster.events[0]!.occurredAt, label: 'First seen by the Astrava pipeline', kind: 'first-seen', sourceIds: [sid(cluster.events[0]!)] })

  const substantiveIndependent = sources.some((s) => s.independent && s.tier !== 'community')
  const notReviewed: Statement = { kind: 'analysis', text: 'Automatically detected from public activity data. Not yet reviewed by an analyst.' }

  return {
    id,
    slug: signalSlugFor(cluster),
    title,
    dek: dek.length >= 8 ? dek : `${dek} Signal detected.`,
    primaryTopic: primary,
    topics,
    status: substantiveIndependent ? 'early-signal' : 'unconfirmed',
    timeToImpact: 'unknown',
    firstSeenAt: cluster.events[0]!.occurredAt,
    updatedAt: now.toISOString(),
    verified: false,
    hidden: false,
    isDemo: false,
    whatHappened: facts,
    whyItMatters: [notReviewed],
    technicalChange: [],
    architecture: null,
    developerImplications: [],
    shouldCare: {
      whatChanged: facts.slice(0, 1),
      whoIsAffected: [],
      whatCanDevelopersDo: [],
      productionReadiness: { level: 'unknown', statement: { kind: 'analysis', text: 'Not assessed.' } },
      whatWouldMakeItImportant: [],
      whatCouldPreventAdoption: [],
    },
    difficulty: null,
    adoptionSignals,
    series,
    events,
    risks: [{ kind: 'analysis', text: 'Generated from activity metrics only; verify the linked sources before acting on it.' }],
    competingApproaches: [],
    builders: [],
    entities: [
      {
        slug: slugify(cluster.key.replace(':', '-'), 110),
        name: cluster.name,
        kind: cluster.kind,
      },
    ],
    sources,
    scoreInputs: {
      assessed: heuristicAssessment(cluster, topics, now),
      ...(momentumSeries ? { momentumSeriesId: momentumSeries.id } : {}),
      ...(adoptionSeries ? { adoptionSeriesId: adoptionSeries.id } : {}),
      independentIntegrations: null,
      reproducibleBenchmark: null,
      runnableArtifact: repo || npm || hf ? true : null,
    },
  }
}

/**
 * Merge with a previously stored signal. Analyst-edited fields (verified
 * signals, or any assessed rubric level set by a person) are preserved;
 * measured evidence is refreshed.
 */
export function mergeWithExisting(fresh: Signal, existing: Signal | undefined): Signal {
  if (!existing) return fresh
  const byUrl = new Map(existing.sources.map((s) => [s.url, s]))
  let next = existing.sources.length
  const remap = new Map<string, string>()
  const sources = [...existing.sources]
  for (const s of fresh.sources) {
    const hit = byUrl.get(s.url)
    if (hit) remap.set(s.id, hit.id)
    else {
      const id = `s${++next}`
      remap.set(s.id, id)
      sources.push({ ...s, id })
    }
  }
  const mapIds = <T extends { sourceIds?: string[] }>(x: T): T => ({ ...x, ...(x.sourceIds ? { sourceIds: x.sourceIds.map((i) => remap.get(i) ?? i) } : {}) })
  const refreshed = {
    ...fresh,
    sources,
    whatHappened: fresh.whatHappened.map(mapIds),
    adoptionSignals: fresh.adoptionSignals.map((a) => ({ ...a, sourceIds: a.sourceIds.map((i) => remap.get(i) ?? i) })),
    events: [...existing.events, ...fresh.events.filter((e) => e.kind !== 'first-seen')].map((e) => ({
      ...e,
      sourceIds: e.sourceIds.map((i) => (existing.sources.some((s) => s.id === i) ? i : remap.get(i) ?? i)),
    })),
    shouldCare: { ...fresh.shouldCare, whatChanged: fresh.shouldCare.whatChanged.map(mapIds) },
  }
  const seenEvent = new Set<string>()
  refreshed.events = refreshed.events.filter((e) => {
    const k = `${e.date}|${e.label}`
    if (seenEvent.has(k)) return false
    seenEvent.add(k)
    return true
  })

  const humanAssessed = (a: AssessedInput) => a.level !== null && !a.rationale.startsWith('Heuristic (automated)')
  const assessed = existing.scoreInputs.assessed
  const base = existing.verified ? existing : refreshed
  return {
    ...base,
    id: existing.id,
    slug: existing.slug,
    firstSeenAt: existing.firstSeenAt,
    updatedAt: fresh.updatedAt,
    title: existing.verified ? existing.title : fresh.title,
    dek: existing.verified ? existing.dek : fresh.dek,
    status: existing.verified ? existing.status : fresh.status,
    timeToImpact: existing.timeToImpact !== 'unknown' ? existing.timeToImpact : fresh.timeToImpact,
    verified: existing.verified,
    hidden: existing.hidden,
    sources: refreshed.sources,
    series: fresh.series.length ? fresh.series : existing.series,
    adoptionSignals: refreshed.adoptionSignals,
    events: refreshed.events,
    whatHappened: existing.verified ? existing.whatHappened : refreshed.whatHappened,
    scoreInputs: {
      ...fresh.scoreInputs,
      ...(existing.scoreInputs.hypeFlags ? { hypeFlags: existing.scoreInputs.hypeFlags } : {}),
      independentIntegrations: existing.scoreInputs.independentIntegrations ?? fresh.scoreInputs.independentIntegrations,
      reproducibleBenchmark: existing.scoreInputs.reproducibleBenchmark ?? fresh.scoreInputs.reproducibleBenchmark,
      assessed: {
        novelty: humanAssessed(assessed.novelty) ? assessed.novelty : fresh.scoreInputs.assessed.novelty,
        technicalSignificance: humanAssessed(assessed.technicalSignificance) ? assessed.technicalSignificance : fresh.scoreInputs.assessed.technicalSignificance,
        developerRelevance: humanAssessed(assessed.developerRelevance) ? assessed.developerRelevance : fresh.scoreInputs.assessed.developerRelevance,
      },
    },
  }
}
