import type { NormalizedEvent, RawEvent, SourceAdapter } from '../types'
import { parseFeed } from '../feed-parser'
import { canonicalizeUrl, httpGet, refsFromUrl, truncate } from '../util'
import { isSafeHttpUrl } from '@/lib/security/url'

/**
 * Official blogs and changelogs via their published RSS/Atom feeds.
 * Configure PIPELINE_RSS_FEEDS as comma-separated `Publisher Name|https://feed.url` pairs.
 */
export function parseFeedConfig(value: string | undefined): { publisher: string; url: string }[] {
  return (value ?? '')
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [publisher, url] = pair.includes('|') ? pair.split('|') : [new URL(pair).hostname, pair]
      return { publisher: publisher!.trim(), url: url!.trim() }
    })
    .filter((f) => isSafeHttpUrl(f.url))
}

export const rssAdapter: SourceAdapter = {
  id: 'rss',
  name: 'Official feeds (RSS/Atom)',
  access: 'Only feeds that publishers provide for syndication; configured explicitly.',
  isEnabled: (env) => parseFeedConfig(env.PIPELINE_RSS_FEEDS).length > 0,
  async fetch(ctx) {
    const out: RawEvent[] = []
    for (const feed of parseFeedConfig(ctx.env.PIPELINE_RSS_FEEDS)) {
      try {
        const xml = (await httpGet(ctx, feed.url, { as: 'text' })) as string
        for (const e of parseFeed(xml)) {
          const when = e.published ?? e.updated
          if (when && new Date(when) < ctx.since) continue
          if (!isSafeHttpUrl(e.link)) continue
          out.push({ source: 'rss', externalId: e.id || e.link, url: e.link, occurredAt: when ?? ctx.now.toISOString(), payload: { entry: e, publisher: feed.publisher } })
        }
      } catch (err) {
        ctx.log(`rss: ${feed.url} failed: ${(err as Error).message}`)
      }
    }
    return out
  },
  normalize(raw): NormalizedEvent | null {
    const { entry, publisher } = raw.payload as { entry: ReturnType<typeof parseFeed>[number]; publisher: string }
    if (!entry?.title) return null
    const linked = [...entry.summary.matchAll(/https?:\/\/[^\s"'<>)]+/g)].flatMap((m) => refsFromUrl(m[0]))
    return {
      source: 'rss',
      externalId: raw.externalId,
      dedupeKey: `rss:${canonicalizeUrl(raw.url)}`,
      url: raw.url,
      canonicalUrl: canonicalizeUrl(raw.url),
      title: entry.title,
      summary: truncate(entry.summary, 400),
      occurredAt: raw.occurredAt,
      kind: 'official',
      tier: 'primary',
      publisher,
      independent: false,
      refs: [...refsFromUrl(raw.url), ...linked],
      text: `${entry.title} ${entry.summary} ${entry.categories.join(' ')}`,
      metrics: [],
    }
  },
}
