/**
 * Minimal OpenAI-compatible chat client. Defaults to Groq (free tier) but works
 * with any compatible endpoint via AI_BASE_URL + AI_API_KEY (e.g. Cerebras,
 * OpenRouter, Google's OpenAI-compatible Gemini endpoint).
 */
export interface AiConfig {
  baseUrl: string
  apiKey: string
  model: string
  maxPerRun: number
}

export function aiConfigFromEnv(env: Record<string, string | undefined> = process.env): AiConfig | null {
  if (env.AI_ENABLED === 'false') return null
  const apiKey = env.AI_API_KEY ?? env.GROQ_API_KEY
  if (!apiKey) return null
  return {
    baseUrl: (env.AI_BASE_URL ?? 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
    apiKey,
    model: env.AI_MODEL ?? 'openai/gpt-oss-20b',
    maxPerRun: Math.max(0, Math.min(50, Number(env.AI_MAX_PER_RUN ?? 3) || 3)),
  }
}

export class AiRateLimited extends Error {}

export async function chatJson(
  config: AiConfig,
  messages: { role: 'system' | 'user'; content: string }[],
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0,
        max_tokens: 2400,
        response_format: { type: 'json_object' },
        // gpt-oss models reason before answering; keep that short to fit free-tier token budgets.
        ...(config.model.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}),
      }),
      signal: controller.signal,
      cache: 'no-store',
    })
    if (res.status === 429) throw new AiRateLimited('AI provider rate limit reached')
    if (!res.ok) throw new Error(`AI request failed: ${res.status} ${(await res.text()).slice(0, 200)}`)
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = body.choices?.[0]?.message?.content ?? ''
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('AI response contained no JSON object')
    return JSON.parse(content.slice(start, end + 1))
  } finally {
    clearTimeout(timer)
  }
}
