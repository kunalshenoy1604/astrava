import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { z } from 'zod'
import { getFeed, settle } from '@/lib/data/queries'
import { TOPICS, TOPIC_BY_SLUG } from '@/lib/demo/topics'
import { STATUS_LABEL } from '@/lib/domain/labels'
import type { SignalStatus } from '@/lib/domain/types'
import { SignalFeed } from '@/components/SignalFeed'
import { ErrorState, LoadingState } from '@/components/States'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const metadata: Metadata = {
  title: 'All signals',
  description:
    'Every tracked technical signal, ranked by Breakout Score, momentum or recency. Filter by topic and status across AI, developer tools, infrastructure, security, robotics and quantum computing.',
  alternates: { canonical: '/signals' },
}

const STATUSES = Object.keys(STATUS_LABEL) as SignalStatus[]
const filtersSchema = z.object({
  topic: z.string().refine((t) => TOPIC_BY_SLUG.has(t)).optional().catch(undefined),
  status: z.enum(STATUSES as [SignalStatus, ...SignalStatus[]]).optional().catch(undefined),
  sort: z.enum(['score', 'recent', 'momentum']).catch('score'),
})
type Filters = z.infer<typeof filtersSchema>

function hrefWith(current: Filters, patch: Partial<Filters>) {
  const next = { ...current, ...patch }
  const qs = new URLSearchParams()
  if (next.topic) qs.set('topic', next.topic)
  if (next.status) qs.set('status', next.status)
  if (next.sort && next.sort !== 'score') qs.set('sort', next.sort)
  const s = qs.toString()
  return s ? `/signals?${s}` : '/signals'
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`meta inline-flex h-7 items-center rounded-xs border px-2 whitespace-nowrap transition-colors ${active ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-2 hover:border-ink hover:text-ink'}`}
    >
      {children}
    </Link>
  )
}

async function FilteredFeed({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams
  const filters = filtersSchema.parse({
    topic: typeof raw.topic === 'string' ? raw.topic : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    sort: typeof raw.sort === 'string' ? raw.sort : 'score',
  })
  const res = await settle(getFeed({ topics: filters.topic ? [filters.topic] : undefined, status: filters.status, sort: filters.sort }))

  return (
    <>
      <div className="grid gap-3 border-b border-rule pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="meta w-14">Sort</span>
          {(['score', 'momentum', 'recent'] as const).map((s) => (
            <Chip key={s} href={hrefWith(filters, { sort: s })} active={filters.sort === s}>
              {s === 'score' ? 'Breakout Score' : s === 'momentum' ? 'Momentum' : 'Most recent'}
            </Chip>
          ))}
        </div>
        <div className="scroll-x flex items-center gap-2">
          <span className="meta w-14 shrink-0">Topic</span>
          <Chip href={hrefWith(filters, { topic: undefined })} active={!filters.topic}>
            All
          </Chip>
          {TOPICS.map((t) => (
            <Chip key={t.slug} href={hrefWith(filters, { topic: t.slug })} active={filters.topic === t.slug}>
              {t.short}
            </Chip>
          ))}
        </div>
        <div className="scroll-x flex items-center gap-2">
          <span className="meta w-14 shrink-0">Status</span>
          <Chip href={hrefWith(filters, { status: undefined })} active={!filters.status}>
            Any
          </Chip>
          {STATUSES.map((s) => (
            <Chip key={s} href={hrefWith(filters, { status: s })} active={filters.status === s}>
              {STATUS_LABEL[s]}
            </Chip>
          ))}
        </div>
      </div>
      <p className="meta mt-4" aria-live="polite">
        {res.ok ? `${res.value.length} signal${res.value.length === 1 ? '' : 's'}` : ''}
        {filters.topic ? ` in ${TOPIC_BY_SLUG.get(filters.topic)!.name}` : ''}
        {filters.status ? ` · ${STATUS_LABEL[filters.status]}` : ''}
      </p>
      <div className="mt-2">
        {res.ok ? (
          <SignalFeed
            signals={res.value}
            ranked={filters.sort === 'score'}
            headingLevel={2}
            empty={{
              title: 'No signals match these filters yet.',
              body: 'Remove the status filter or try a neighbouring topic such as AI infrastructure or developer tools.',
              action: { href: '/signals', label: 'Clear filters' },
            }}
          />
        ) : (
          <ErrorState retryHref="/signals" />
        )}
      </div>
    </>
  )
}

export default function SignalsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="mx-auto max-w-page px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Signals', href: '/signals' }]} />
      <header className="mt-6 mb-8 max-w-3xl">
        <h1 className="font-serif text-4xl font-medium tracking-[-0.02em] sm:text-5xl">All signals</h1>
        <p className="mt-3 text-lg text-ink-2">
          Technical developments with observable momentum. Ranked by Breakout Score by default — an analytical ranking, not a
          prediction.
        </p>
      </header>
      <Suspense fallback={<LoadingState rows={6} />}>
        <FilteredFeed searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
