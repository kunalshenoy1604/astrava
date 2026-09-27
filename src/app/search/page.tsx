import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { searchEverything, settle } from '@/lib/data/queries'
import { normalizeQuery } from '@/lib/search/rank'
import type { SearchResult } from '@/lib/domain/types'
import { EmptyState, ErrorState, LoadingState } from '@/components/States'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search signals, technologies, companies, papers, open-source projects and topics.',
  alternates: { canonical: '/search' },
  robots: { index: false, follow: true },
}

const GROUPS: { label: string; types: SearchResult['type'][] }[] = [
  { label: 'Signals', types: ['signal'] },
  { label: 'Technologies & standards', types: ['technology', 'standard'] },
  { label: 'Projects & repositories', types: ['repository'] },
  { label: 'Companies & organisations', types: ['company', 'organization'] },
  { label: 'Papers', types: ['paper'] },
  { label: 'Topics', types: ['topic'] },
]

type SP = Promise<Record<string, string | string[] | undefined>>

async function SearchForm({ searchParams }: { searchParams: SP }) {
  const q = normalizeQuery(String((await searchParams).q ?? ''))
  return (
    <form action="/search" role="search" className="flex gap-2">
      <label htmlFor="q" className="sr-only">
        Search
      </label>
      <input id="q" name="q" defaultValue={q} placeholder="e.g. inference, sandbox, post-quantum" className="field h-12 text-base" maxLength={120} autoFocus />
      <button className="btn-primary h-12 px-5">Search</button>
    </form>
  )
}

async function Results({ searchParams }: { searchParams: SP }) {
  const q = normalizeQuery(String((await searchParams).q ?? ''))
  if (q.length < 2) {
    return <p className="text-sm text-ink-2">Type at least two characters. Search covers signals, technologies, companies, papers, projects and topics.</p>
  }
  const res = await settle(searchEverything(q))
  if (!res.ok) return <ErrorState title="Search is unavailable right now." />
  if (res.value.length === 0) {
    return (
      <EmptyState
        title={`No matches for “${q}”.`}
        body="Try a technology name, a broader term, or browse by topic."
        action={{ href: '/topics', label: 'Browse topics' }}
      />
    )
  }
  return (
    <div className="grid gap-10">
      <p className="meta" aria-live="polite">
        {res.value.length} results for “{q}”
      </p>
      {GROUPS.map((g) => {
        const items = res.value.filter((r) => g.types.includes(r.type))
        if (!items.length) return null
        return (
          <section key={g.label} aria-label={g.label}>
            <h2 className="meta mb-2 border-b border-rule-strong pb-2 text-ink">
              {g.label} <span className="numeric text-ink-3">({items.length})</span>
            </h2>
            <ul className="divide-y divide-rule">
              {items.map((r, i) => (
                <li key={`${r.href}-${i}`} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <Link href={r.href} className="font-medium hover:text-accent">
                      {r.title}
                    </Link>
                    <p className="line-clamp-2 text-sm text-ink-2">{r.snippet}</p>
                    <p className="meta mt-1 text-[10px]">{r.meta.join(' · ')}</p>
                  </div>
                  {typeof r.score === 'number' ? <span className="numeric text-lg">{r.score}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export default function SearchPage({ searchParams }: { searchParams: SP }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Search', href: '/search' }]} />
      <h1 className="mt-6 mb-6 font-serif text-4xl font-medium tracking-[-0.02em]">Search</h1>
      <Suspense fallback={<div className="field h-12" />}>
        <SearchForm searchParams={searchParams} />
      </Suspense>
      <div className="mt-10">
        <Suspense fallback={<LoadingState rows={3} label="Searching" />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}
