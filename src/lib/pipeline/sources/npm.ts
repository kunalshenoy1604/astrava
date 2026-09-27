import type { NormalizedEvent, RawEvent, SourceAdapter } from '../types'
import { canonicalizeUrl, httpGet, refsFromUrl, truncate } from '../util'

/** npm registry search + downloads API (both official, public). */
interface SearchObject {
  package: { name: string; description?: string; keywords?: string[]; links?: { repository?: string; npm?: string }; date?: string }
}
interface Range {
  downloads: { day: string; downloads: number }[]
  package: string
}

const DEFAULT_KEYWORDS = 'llm,ai-agent,mcp,inference,webgpu'

export const npmAdapter: SourceAdapter = {
  id: 'npm',
  name: 'npm registry',
  access: 'Official registry search and api.npmjs.org downloads endpoints.',
  isEnabled: () => true,
  async fetch(ctx) {
    const keywords = (ctx.env.PIPELINE_NPM_KEYWORDS ?? DEFAULT_KEYWORDS).split(',').map((k) => k.trim()).filter(Boolean)
    const out: RawEvent[] = []
    for (const kw of keywords) {
      const search = (await httpGet(ctx, `https://registry.npmjs.org/-/v1/search?text=keywords:${encodeURIComponent(kw)}&size=20&popularity=0.2&quality=0.3&maintenance=0.5`)) as {
        objects?: SearchObject[]
      }
      for (const obj of search.objects ?? []) {
        const name = obj.package.name
        const range = (await httpGet(ctx, `https://api.npmjs.org/downloads/range/last-month/${encodeURIComponent(name).replace('%40', '@')}`).catch(
          () => null,
        )) as Range | null
        out.push({
          source: 'npm',
          externalId: `${name}:${ctx.now.toISOString().slice(0, 10)}`,
          url: `https://www.npmjs.com/package/${name}`,
          occurredAt: ctx.now.toISOString(),
          payload: { pkg: obj.package, range },
        })
      }
    }
    return out
  },
  normalize(raw): NormalizedEvent | null {
    const { pkg, range } = raw.payload as { pkg: SearchObject['package']; range: Range | null }
    if (!pkg?.name) return null
    const repoRefs = pkg.links?.repository ? refsFromUrl(pkg.links.repository) : []
    return {
      source: 'npm',
      externalId: raw.externalId,
      dedupeKey: `npm:${pkg.name}:${raw.occurredAt.slice(0, 10)}`,
      url: raw.url,
      canonicalUrl: canonicalizeUrl(raw.url),
      title: `${pkg.name} on npm`,
      summary: truncate(pkg.description ?? '', 280),
      occurredAt: raw.occurredAt,
      kind: 'official',
      tier: 'primary',
      publisher: 'npm registry',
      independent: false,
      refs: [`npm:${pkg.name.toLowerCase()}`, ...repoRefs],
      text: `${pkg.name} ${pkg.description ?? ''} ${(pkg.keywords ?? []).join(' ')}`,
      metrics: (range?.downloads ?? []).map((d) => ({
        id: 'npm_downloads',
        label: 'npm downloads',
        unit: 'downloads',
        value: d.downloads,
        on: d.day,
        aggregation: 'periodic' as const,
      })),
    }
  },
}
