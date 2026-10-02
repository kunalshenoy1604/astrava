/**
 * Collects the primary text the AI layer is allowed to read for a signal:
 * README / model card / package readme / paper abstract / stored source notes.
 * Only official APIs and raw files that the publishers host for reading.
 */
import type { Signal } from '@/lib/domain/types'

export interface SourceText {
  sourceId: string
  label: string
  text: string
}

const MAX_CHARS_PER_SOURCE = 3500
const MAX_TOTAL_CHARS = 5000

/** Markdown/HTML → plain prose: drops code blocks, images, badges, tables and link targets. */
export function cleanMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/^#+\s*/gm, '')
    .replace(/[*_`>]/g, '')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function get(fetchImpl: typeof fetch, url: string, headers: Record<string, string> = {}): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    const res = await fetchImpl(url, { headers: { 'User-Agent': 'AstravaSignalPipeline/1.0', ...headers }, signal: controller.signal, cache: 'no-store' })
    return res.ok ? await res.text() : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function collectSourceText(
  signal: Signal,
  opts: { fetchImpl?: typeof fetch; githubToken?: string } = {},
): Promise<SourceText[]> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const out: SourceText[] = []
  for (const src of signal.sources) {
    if (src.isPlaceholder) continue
    let raw: string | null = null
    const url = new URL(src.url)
    const parts = url.pathname.split('/').filter(Boolean)
    if (url.hostname === 'github.com' && parts.length >= 2 && src.kind === 'github') {
      raw = await get(fetchImpl, `https://api.github.com/repos/${parts[0]}/${parts[1]}/readme`, {
        Accept: 'application/vnd.github.raw+json',
        ...(opts.githubToken ? { Authorization: `Bearer ${opts.githubToken}` } : {}),
      })
    } else if (url.hostname === 'huggingface.co' && parts.length >= 2) {
      raw = await get(fetchImpl, `https://huggingface.co/${parts[0]}/${parts[1]}/raw/main/README.md`)
      if (raw) raw = raw.replace(/^---[\s\S]*?---/, '') // YAML front matter
    } else if (url.hostname.endsWith('npmjs.com') && parts[0] === 'package') {
      const name = parts.slice(1).join('/')
      const json = await get(fetchImpl, `https://registry.npmjs.org/${name.replace('/', '%2F')}`)
      if (json) {
        try {
          raw = (JSON.parse(json) as { readme?: string }).readme ?? null
        } catch {
          raw = null
        }
      }
    }
    const pieces = [src.title, src.note, raw ? cleanMarkdown(raw) : null].filter(Boolean).join('. ')
    if (pieces.trim()) out.push({ sourceId: src.id, label: `${src.publisher}: ${src.title}`, text: pieces.slice(0, MAX_CHARS_PER_SOURCE) })
  }
  // Keep the total prompt bounded (free-tier token budgets).
  let budget = MAX_TOTAL_CHARS
  return out
    .map((s) => {
      const text = s.text.slice(0, Math.max(0, budget))
      budget -= text.length
      return { ...s, text }
    })
    .filter((s) => s.text.length > 0)
}
