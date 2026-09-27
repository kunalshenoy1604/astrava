import type { FetchContext } from './types'

const TRACKING_PARAMS = /^(utm_[a-z]+|ref|ref_src|source|fbclid|gclid|mc_cid|mc_eid)$/i

/** Canonical form for URL-level deduplication. */
export function canonicalizeUrl(input: string): string {
  try {
    const u = new URL(input)
    u.hash = ''
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '')
    if (u.hostname === 'arxiv.org') u.pathname = u.pathname.replace(/^\/pdf\//, '/abs/').replace(/v\d+(\.pdf)?$/, '').replace(/\.pdf$/, '')
    for (const key of [...u.searchParams.keys()]) if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key)
    u.searchParams.sort()
    let s = u.toString()
    if (s.endsWith('/') && u.pathname !== '/') s = s.slice(0, -1)
    return s.replace(/^http:\/\//, 'https://')
  } catch {
    return input.trim()
  }
}

/** Extracts canonical entity references from a URL (GitHub repo, arXiv id, HF model, npm package). */
export function refsFromUrl(input: string): string[] {
  try {
    const u = new URL(canonicalizeUrl(input))
    const parts = u.pathname.split('/').filter(Boolean)
    if (u.hostname === 'github.com' && parts.length >= 2) return [`github:${parts[0]!.toLowerCase()}/${parts[1]!.toLowerCase()}`]
    if (u.hostname === 'arxiv.org' && parts[0] === 'abs' && parts[1]) return [`arxiv:${parts[1]}`]
    if (u.hostname === 'huggingface.co' && parts.length >= 2 && !['datasets', 'spaces', 'docs', 'blog', 'papers'].includes(parts[0]!))
      return [`hf:${parts[0]!.toLowerCase()}/${parts[1]!.toLowerCase()}`]
    if (u.hostname === 'npmjs.com' && parts[0] === 'package' && parts[1])
      return [`npm:${(parts[1].startsWith('@') && parts[2] ? `${parts[1]}/${parts[2]}` : parts[1]).toLowerCase()}`]
  } catch {
    /* not a URL */
  }
  return []
}

export function slugify(input: string, max = 100): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '')
}

export function isoDate(d: Date | string): string {
  return (typeof d === 'string' ? new Date(d) : d).toISOString().slice(0, 10)
}

/** Monday (UTC) of the week containing `d`. */
export function weekStart(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(`${d.slice(0, 10)}T00:00:00Z`) : new Date(d)
  const dow = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dow)
  return isoDate(date)
}

export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncate(input: string, max: number): string {
  return input.length <= max ? input : `${input.slice(0, max - 1).trimEnd()}…`
}

const TIMEOUT_MS = 15_000

/** JSON/text GET with timeout, identifying User-Agent, and a clear error on non-2xx. */
export async function httpGet(ctx: FetchContext, url: string, init: { headers?: Record<string, string>; as?: 'json' | 'text' } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await ctx.fetch(url, {
      headers: {
        'User-Agent': ctx.env.PIPELINE_USER_AGENT ?? 'AstravaSignalPipeline/1.0 (+https://github.com/)',
        Accept: init.as === 'text' ? 'application/atom+xml, application/rss+xml, application/xml, text/xml' : 'application/json',
        ...init.headers,
      },
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`GET ${new URL(url).host}${new URL(url).pathname} → ${res.status}`)
    return init.as === 'text' ? await res.text() : await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
