import type { NormalizedEvent, SourceAdapter } from '../types'
import { canonicalizeUrl, httpGet, refsFromUrl } from '../util'

/** Hacker News via the Algolia HN Search API (public, documented, no scraping). */
interface Hit {
  objectID: string
  title: string | null
  url: string | null
  points: number | null
  num_comments: number | null
  created_at: string
  author: string
}

export const hackerNewsAdapter: SourceAdapter = {
  id: 'hackernews',
  name: 'Hacker News',
  access: 'Algolia HN Search API (hn.algolia.com/api). Community signal only.',
  isEnabled: () => true,
  async fetch(ctx) {
    const since = Math.floor(ctx.since.getTime() / 1000)
    const url = `https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=100&numericFilters=${encodeURIComponent(`created_at_i>${since},points>20`)}`
    const body = (await httpGet(ctx, url)) as { hits?: Hit[] }
    return (body.hits ?? [])
      .filter((h) => h.title)
      .map((h) => ({ source: 'hackernews', externalId: h.objectID, url: `https://news.ycombinator.com/item?id=${h.objectID}`, occurredAt: h.created_at, payload: h }))
  },
  normalize(raw): NormalizedEvent | null {
    const h = raw.payload as Hit
    if (!h.title) return null
    const target = h.url ?? raw.url
    return {
      source: 'hackernews',
      externalId: h.objectID,
      dedupeKey: `hackernews:${h.objectID}`,
      url: raw.url,
      canonicalUrl: canonicalizeUrl(raw.url),
      title: `Hacker News: ${h.title}`,
      summary: `${h.points ?? 0} points, ${h.num_comments ?? 0} comments.`,
      occurredAt: h.created_at,
      kind: 'discussion',
      tier: 'community',
      publisher: 'Hacker News',
      independent: true,
      refs: refsFromUrl(target),
      text: `${h.title} ${target}`,
      metrics: [
        { id: 'hn_points', label: 'Hacker News points', unit: 'points', value: h.points ?? 0, on: h.created_at.slice(0, 10), aggregation: 'periodic' },
      ],
    }
  },
}
