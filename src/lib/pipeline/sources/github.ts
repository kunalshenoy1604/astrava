import type { NormalizedEvent, SourceAdapter } from '../types'
import { canonicalizeUrl, httpGet, isoDate, truncate } from '../util'

/**
 * GitHub REST API (search/repositories). Official API; unauthenticated calls
 * are limited to 10 search requests/minute, so set GITHUB_TOKEN in production.
 */
interface Repo {
  id: number
  full_name: string
  html_url: string
  description: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  language: string | null
  topics?: string[]
  created_at: string
  pushed_at: string
  homepage: string | null
  owner: { login: string }
  license: { spdx_id: string | null } | null
}

/** One search per topic keeps each query simple (GitHub limits boolean operators per query). */
const DEFAULT_TOPICS = ['llm', 'ai-agents', 'mcp', 'inference', 'robotics', 'quantum-computing', 'security', 'developer-tools']

export const githubAdapter: SourceAdapter = {
  id: 'github',
  name: 'GitHub',
  access: 'Official REST API (search/repositories). Respects rate limits; token recommended.',
  isEnabled: () => true,
  async fetch(ctx) {
    const since = isoDate(new Date(ctx.since.getTime() - 60 * 24 * 3600 * 1000)) // repos created in the last ~60 days
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    if (ctx.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${ctx.env.GITHUB_TOKEN}`
    const queries = ctx.env.PIPELINE_GITHUB_QUERY
      ? [ctx.env.PIPELINE_GITHUB_QUERY]
      : DEFAULT_TOPICS.map((t) => `topic:${t}`)
    const repos = new Map<number, Repo>()
    const failures: string[] = []
    for (const q of queries) {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`${q} created:>${since} stars:>25`)}&sort=stars&order=desc&per_page=30`
      try {
        const body = (await httpGet(ctx, url, { headers })) as { items?: Repo[] }
        for (const r of body.items ?? []) repos.set(r.id, r)
      } catch (err) {
        failures.push((err as Error).message)
      }
    }
    if (repos.size === 0 && failures.length) throw new Error(failures[0])
    return [...repos.values()].map((repo) => ({
      source: 'github',
      externalId: `${repo.id}:${isoDate(ctx.now)}`,
      url: repo.html_url,
      occurredAt: ctx.now.toISOString(),
      payload: repo,
    }))
  },
  normalize(raw): NormalizedEvent | null {
    const repo = raw.payload as Repo
    if (!repo?.full_name || !repo.html_url) return null
    const on = raw.occurredAt.slice(0, 10)
    return {
      source: 'github',
      externalId: raw.externalId,
      dedupeKey: `github:${repo.id}:${on}`,
      url: repo.html_url,
      canonicalUrl: canonicalizeUrl(repo.html_url),
      title: `${repo.full_name} repository`,
      summary: truncate(repo.description ?? '', 280),
      occurredAt: raw.occurredAt,
      createdAt: repo.created_at,
      kind: 'github',
      tier: 'primary',
      publisher: 'GitHub',
      independent: false,
      refs: [`github:${repo.full_name.toLowerCase()}`],
      text: [repo.full_name, repo.description, repo.language, ...(repo.topics ?? [])].filter(Boolean).join(' '),
      metrics: [
        { id: 'github_stars_total', label: 'GitHub stars (total)', unit: 'stars', value: repo.stargazers_count, on, aggregation: 'cumulative' },
        { id: 'github_forks_total', label: 'Forks (total)', unit: 'forks', value: repo.forks_count, on, aggregation: 'cumulative' },
      ],
    }
  },
}
