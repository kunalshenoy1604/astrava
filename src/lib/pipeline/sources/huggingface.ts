import type { NormalizedEvent, SourceAdapter } from '../types'
import { canonicalizeUrl, httpGet, isoDate } from '../util'

/** Hugging Face Hub public models API. */
interface Model {
  id: string
  likes?: number
  downloads?: number
  pipeline_tag?: string
  tags?: string[]
  createdAt?: string
  lastModified?: string
}

/**
 * Re-uploads (quantizations, format conversions, merges) and NSFW/"uncensored"
 * variants dominate trending lists but are rarely new technology. They are
 * excluded at the source; the original model still qualifies on its own.
 */
const DERIVATIVE = /(gguf|gptq|awq|exl2|mlx|bnb|onnx|[-_](4|5|6|8)bit|int[48]|fp8|nf4|quant|uncensored|abliterat|heretic|nsfw|lewd|erotic|merge)/i
export function isDerivativeModel(id: string, tags: string[] = []): boolean {
  return DERIVATIVE.test(id) || tags.some((t) => t.startsWith('base_model:quantized:') || t.startsWith('base_model:merge:') || t === 'not-for-all-audiences')
}

export const huggingFaceAdapter: SourceAdapter = {
  id: 'huggingface',
  name: 'Hugging Face Hub',
  access: 'Official Hub API (huggingface.co/api/models).',
  isEnabled: () => true,
  async fetch(ctx) {
    const headers: Record<string, string> = {}
    if (ctx.env.HF_TOKEN) headers.Authorization = `Bearer ${ctx.env.HF_TOKEN}`
    const body = (await httpGet(ctx, 'https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=50', { headers })) as Model[]
    return body.map((m) => ({
      source: 'huggingface',
      externalId: `${m.id}:${isoDate(ctx.now)}`,
      url: `https://huggingface.co/${m.id}`,
      occurredAt: ctx.now.toISOString(),
      payload: m,
    }))
  },
  normalize(raw): NormalizedEvent | null {
    const m = raw.payload as Model
    if (!m?.id || !m.id.includes('/')) return null
    if (isDerivativeModel(m.id, m.tags)) return null
    const on = raw.occurredAt.slice(0, 10)
    return {
      source: 'huggingface',
      externalId: raw.externalId,
      dedupeKey: `huggingface:${m.id.toLowerCase()}:${on}`,
      url: raw.url,
      canonicalUrl: canonicalizeUrl(raw.url),
      title: `${m.id} model card`,
      summary: [m.pipeline_tag, ...(m.tags ?? []).slice(0, 6)].filter(Boolean).join(' · '),
      occurredAt: raw.occurredAt,
      createdAt: m.createdAt,
      kind: 'official',
      tier: 'primary',
      publisher: 'Hugging Face Hub',
      independent: false,
      refs: [`hf:${m.id.toLowerCase()}`],
      text: `${m.id} ${m.pipeline_tag ?? ''} ${(m.tags ?? []).join(' ')}`,
      metrics: [
        { id: 'hf_likes_total', label: 'Hugging Face likes (total)', unit: 'likes', value: m.likes ?? 0, on, aggregation: 'cumulative' },
      ],
    }
  },
}
