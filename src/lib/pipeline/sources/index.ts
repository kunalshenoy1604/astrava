import type { PipelineEnv, SourceAdapter } from '../types'
import { githubAdapter } from './github'
import { arxivAdapter } from './arxiv'
import { hackerNewsAdapter } from './hackernews'
import { huggingFaceAdapter } from './huggingface'
import { npmAdapter } from './npm'
import { rssAdapter } from './rss'

/** Registry of source adapters. Add new sources here. */
export const ALL_ADAPTERS: SourceAdapter[] = [githubAdapter, arxivAdapter, hackerNewsAdapter, huggingFaceAdapter, npmAdapter, rssAdapter]

export function enabledAdapters(env: PipelineEnv): SourceAdapter[] {
  const allow = env.PIPELINE_ENABLED_SOURCES?.split(',').map((s) => s.trim()).filter(Boolean)
  return ALL_ADAPTERS.filter((a) => (!allow?.length || allow.includes(a.id)) && a.isEnabled(env))
}
