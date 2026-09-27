/**
 * Minimal, dependency-free Atom 1.0 / RSS 2.0 parser — enough for arXiv's API
 * and official blog feeds. It reads only the fields the pipeline uses and
 * never evaluates markup; all text is entity-decoded and HTML-stripped.
 */
import { stripHtml } from './util'

export interface FeedEntry {
  id: string
  title: string
  link: string
  summary: string
  published: string | null
  updated: string | null
  authors: string[]
  categories: string[]
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? stripHtml(decode(m[1]!)) : null
}

function tags(block: string, name: string): string[] {
  return [...block.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'gi'))].map((m) => stripHtml(decode(m[1]!)))
}

function attr(block: string, tagName: string, attrName: string, where?: (el: string) => boolean): string | null {
  for (const m of block.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))) {
    const el = m[0]
    if (where && !where(el)) continue
    const a = el.match(new RegExp(`${attrName}\\s*=\\s*"([^"]*)"`, 'i'))
    if (a) return decode(a[1]!)
  }
  return null
}

export function parseFeed(xml: string): FeedEntry[] {
  const isAtom = /<feed[\s>]/i.test(xml)
  const blocks = [...xml.matchAll(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0])
  return blocks.map((b) => {
    if (isAtom) {
      const link =
        attr(b, 'link', 'href', (el) => /rel="alternate"/i.test(el) || !/rel=/i.test(el)) ?? attr(b, 'link', 'href') ?? tag(b, 'id') ?? ''
      return {
        id: tag(b, 'id') ?? link,
        title: tag(b, 'title') ?? '',
        link,
        summary: tag(b, 'summary') ?? tag(b, 'content') ?? '',
        published: tag(b, 'published'),
        updated: tag(b, 'updated'),
        authors: tags(b, 'name'),
        categories: [...b.matchAll(/<category\b[^>]*term="([^"]+)"/gi)].map((m) => m[1]!),
      }
    }
    const link = tag(b, 'link') ?? ''
    return {
      id: tag(b, 'guid') ?? link,
      title: tag(b, 'title') ?? '',
      link,
      summary: tag(b, 'description') ?? '',
      published: tag(b, 'pubDate') ? new Date(tag(b, 'pubDate')!).toISOString() : null,
      updated: null,
      authors: tags(b, 'dc:creator').concat(tags(b, 'author')),
      categories: tags(b, 'category'),
    }
  })
}
