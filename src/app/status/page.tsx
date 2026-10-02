import type { Metadata } from 'next'
import { Suspense } from 'react'
import { connection } from 'next/server'
import { loadLiveSnapshot } from '@/lib/data/live-repository'
import { privilegedHost, privilegedSql } from '@/lib/db/privileged'
import { aiConfigFromEnv } from '@/lib/ai/client'
import { sanitizeError } from '@/lib/ai/enricher'
import { isSupabaseConfigured } from '@/lib/config'
import { formatDateTime } from '@/lib/format'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { LoadingState } from '@/components/States'

export const metadata: Metadata = {
  title: 'System status',
  description: 'What the Astrava pipeline collected on its latest run, per source, and what the AI layer verified or discarded.',
  robots: { index: false, follow: true },
}

const SOURCE_NAMES: Record<string, string> = {
  github: 'GitHub',
  arxiv: 'arXiv',
  hackernews: 'Hacker News',
  huggingface: 'Hugging Face',
  npm: 'npm',
  rss: 'Official feeds',
}

type Tone = 'ok' | 'warn' | 'bad' | undefined

function Row({ k, v, tone }: { k: string; v: string; tone?: Tone }) {
  const color = tone === 'ok' ? 'text-positive' : tone === 'warn' ? 'text-caution' : tone === 'bad' ? 'text-negative' : ''
  return (
    <div className="grid grid-cols-[minmax(8rem,12rem)_1fr] gap-4 border-t border-rule py-2.5 text-sm">
      <dt className="text-ink-2">{k}</dt>
      <dd className={`numeric min-w-0 break-words ${color}`}>{v}</dd>
    </div>
  )
}

async function databaseStatus(): Promise<{ text: string; tone: Tone }> {
  if (!isSupabaseConfigured) return { text: 'Not configured', tone: 'warn' }
  try {
    const sql = await privilegedSql()
    if (!sql) return { text: 'Supabase API configured; direct connection unavailable', tone: 'warn' }
    const [row] = await sql<{ n: number }[]>`select count(*)::int as n from public._astrava_migrations`
    return { text: `Connected via ${await privilegedHost()} · ${row?.n ?? 0} migrations applied`, tone: 'ok' }
  } catch (err) {
    return { text: sanitizeError((err as Error).message), tone: 'bad' }
  }
}

async function Status() {
  await connection()
  const dbWithTimeout = Promise.race([
    databaseStatus(),
    new Promise<{ text: string; tone: Tone }>((resolve) => setTimeout(() => resolve({ text: 'Connection check timed out', tone: 'bad' }), 15_000)),
  ])
  const [snap, db] = await Promise.all([loadLiveSnapshot(), dbWithTimeout])
  const s = snap.stats
  const ai = s.ai
  const aiConfig = aiConfigFromEnv()
  return (
    <>
      <section aria-labelledby="run-h">
        <h2 id="run-h" className="meta mb-2 text-ink">
          Latest pipeline run
        </h2>
        <dl>
          <Row k="Generated" v={formatDateTime(snap.generatedAt)} />
          <Row k="Signals published" v={String(snap.entries.length)} tone={snap.entries.length ? 'ok' : 'bad'} />
          <Row k="Events normalised" v={String(s.normalized)} />
          <Row k="Below threshold or off-topic" v={String(s.skippedBelowThreshold)} />
          {Object.entries(SOURCE_NAMES).map(([id, name]) => (
            <Row
              key={id}
              k={name}
              v={s.errors[id] ? `Error: ${sanitizeError(s.errors[id]!)}` : s.fetched[id] !== undefined ? `${s.fetched[id]} items` : 'Not enabled'}
              tone={s.errors[id] ? 'bad' : s.fetched[id] ? 'ok' : undefined}
            />
          ))}
        </dl>
      </section>
      <section aria-labelledby="ai-h" className="mt-10">
        <h2 id="ai-h" className="meta mb-2 text-ink">
          AI contextual layer
        </h2>
        <dl>
          <Row
            k="Model"
            v={aiConfig ? `${aiConfig.model} · up to ${aiConfig.maxPerRun} new analyses per run` : 'Not configured'}
            tone={aiConfig ? 'ok' : 'warn'}
          />
          {ai ? (
            <>
              <Row k="Analysed this run" v={String(ai.enriched)} />
              <Row k="Reused from cache" v={String(ai.fromCache)} />
              <Row k="Claims verified / discarded" v={`${ai.verifiedClaims} / ${ai.droppedClaims}`} />
              <Row k="Filtered as off-topic" v={String(ai.filtered)} />
              <Row
                k="Errors"
                v={ai.errors ? `${ai.errors}${ai.lastError ? ` · ${ai.lastError}` : ''}` : ai.rateLimited ? 'Rate limited; resumes next run' : 'None'}
                tone={ai.errors ? 'bad' : 'ok'}
              />
            </>
          ) : (
            <Row k="This run" v="Did not run" tone="warn" />
          )}
        </dl>
      </section>
      <section aria-labelledby="db-h" className="mt-10">
        <h2 id="db-h" className="meta mb-2 text-ink">
          Accounts & database
        </h2>
        <dl>
          <Row k="Database" v={db.text} tone={db.tone} />
        </dl>
      </section>
    </>
  )
}

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Status', href: '/status' }]} />
      <h1 className="mt-6 font-serif text-4xl font-medium tracking-[-0.02em]">System status</h1>
      <p className="mt-3 mb-10 text-lg text-ink-2">What the pipeline collected on its latest run, and what the AI layer verified or discarded.</p>
      <Suspense fallback={<LoadingState rows={3} label="Loading status" />}>
        <Status />
      </Suspense>
    </div>
  )
}
