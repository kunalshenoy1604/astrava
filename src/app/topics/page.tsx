import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getFeed, settle } from '@/lib/data/queries'
import { TOPICS } from '@/lib/demo/topics'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ErrorState, LoadingState } from '@/components/States'
import { ScoreTicks } from '@/components/SignalScore'

export const metadata: Metadata = {
  title: 'Topics',
  description:
    'Browse technical signals by area: AI agents, foundation models, AI infrastructure, developer tools, open source, robotics, quantum computing, cybersecurity and computing infrastructure.',
  alternates: { canonical: '/topics' },
}

async function TopicGrid() {
  const res = await settle(getFeed())
  if (!res.ok) return <ErrorState retryHref="/topics" />
  const all = res.value
  return (
    <ul className="grid gap-x-10 border-t border-rule-strong sm:grid-cols-2 lg:grid-cols-3">
      {TOPICS.map((t) => {
        const list = all.filter((s) => s.topics.includes(t.slug))
        const top = list[0]
        return (
          <li key={t.slug} className="border-b border-rule py-6">
            <p className="meta flex justify-between">
              <span>{t.parent ? 'Sub-topic' : 'Topic'}</span>
              <span className="numeric">{list.length} signals</span>
            </p>
            <h2 className="mt-2 font-serif text-2xl font-medium">
              <Link href={`/topics/${t.slug}`} className="hover:text-accent">
                {t.name}
              </Link>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{t.description}</p>
            {top ? (
              <p className="mt-4 border-l-2 border-accent pl-3 text-sm">
                <span className="meta block text-[10px]">Top signal · {top.score}</span>
                <Link href={`/signals/${top.slug}`} className="hover:text-accent">
                  {top.title}
                </Link>
                <ScoreTicks score={top.score} className="mt-2" />
              </p>
            ) : (
              <p className="mt-4 text-sm text-ink-3">No signals yet.</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function TopicsPage() {
  return (
    <div className="mx-auto max-w-page px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Topics', href: '/topics' }]} />
      <header className="mt-6 mb-10 max-w-3xl">
        <h1 className="font-serif text-4xl font-medium tracking-[-0.02em] sm:text-5xl">Topics</h1>
        <p className="mt-3 text-lg text-ink-2">
          Ten areas where early technical changes tend to matter for developers. Each topic page lists current and historical
          signals, the areas we track, and how evidence is judged in that field.
        </p>
      </header>
      <Suspense fallback={<LoadingState rows={3} label="Loading topics" />}>
        <TopicGrid />
      </Suspense>
    </div>
  )
}
