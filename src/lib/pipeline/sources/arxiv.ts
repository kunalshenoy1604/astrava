import type { NormalizedEvent, SourceAdapter } from '../types'
import { parseFeed } from '../feed-parser'
import { canonicalizeUrl, httpGet, truncate } from '../util'

/**
 * arXiv API (Atom). Per arXiv's API terms: identify the client, keep to one
 * request every few seconds, and link back to arxiv.org abstracts.
 */
const DEFAULT_CATEGORIES = 'cs.AI cs.LG cs.CL cs.RO cs.CR cs.DC quant-ph'

export const arxivAdapter: SourceAdapter = {
  id: 'arxiv',
  name: 'arXiv',
  access: 'Official arXiv API (export.arxiv.org). One request per run, well under the published rate guidance.',
  isEnabled: () => true,
  async fetch(ctx) {
    const cats = (ctx.env.PIPELINE_ARXIV_CATEGORIES ?? DEFAULT_CATEGORIES).split(/\s+/).filter(Boolean)
    const query = cats.map((c) => `cat:${c}`).join(' OR ')
    const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&sortBy=submittedDate&sortOrder=descending&max_results=100`
    const xml = (await httpGet(ctx, url, { as: 'text' })) as string
    return parseFeed(xml)
      .filter((e) => (e.published ? new Date(e.published) >= ctx.since : true))
      .map((e) => ({ source: 'arxiv', externalId: e.id, url: e.link || e.id, occurredAt: e.published ?? ctx.now.toISOString(), payload: e }))
  },
  normalize(raw): NormalizedEvent | null {
    const e = raw.payload as ReturnType<typeof parseFeed>[number]
    const idMatch = e.id.match(/abs\/([^v\s]+)(v\d+)?$/)
    if (!idMatch || !e.title) return null
    const arxivId = idMatch[1]!
    const url = `https://arxiv.org/abs/${arxivId}`
    const codeLinks = [...e.summary.matchAll(/https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/g)].map((m) => m[0].replace(/[.)]+$/, ''))
    return {
      source: 'arxiv',
      externalId: arxivId,
      dedupeKey: `arxiv:${arxivId}`,
      url,
      canonicalUrl: canonicalizeUrl(url),
      title: e.title,
      summary: truncate(e.summary, 400),
      occurredAt: raw.occurredAt,
      kind: 'paper',
      tier: 'primary',
      publisher: e.authors.length ? `${e.authors[0]}${e.authors.length > 1 ? ' et al.' : ''} (arXiv)` : 'arXiv',
      independent: false,
      refs: [`arxiv:${arxivId}`, ...codeLinks.map((l) => `github:${l.split('/').slice(3, 5).join('/').toLowerCase()}`)],
      text: `${e.title} ${e.summary} ${e.categories.join(' ')}`,
      metrics: [],
    }
  },
}
