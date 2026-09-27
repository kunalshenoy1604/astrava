import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowRight } from 'lucide-react'
import { getFeed, settle } from '@/lib/data/queries'
import { TOPICS } from '@/lib/demo/topics'
import { SignalFeed } from '../SignalFeed'
import { ErrorState, LoadingState } from '../States'
import { RadarTeaser, RadarTeaserFallback } from './RadarTeaser'
import { TopMovers } from './TopMovers'

const HOME_LIMIT = 8

async function HomeFeed() {
  const [feed, all] = await Promise.all([settle(getFeed({ limit: HOME_LIMIT })), settle(getFeed())])
  if (!feed.ok) return <ErrorState retryHref="/#feed" />
  return (
    <>
      <SignalFeed signals={feed.value} ranked headingLevel={3} />
      <div className="mt-6 flex justify-end">
        <Link href="/signals" className="btn-secondary">
          All {all.ok ? all.value.length : ''} signals <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </>
  )
}

export function FeedSection() {
  return (
    <section id="feed" aria-labelledby="feed-heading" className="mx-auto max-w-page scroll-mt-16 px-4 pt-12 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="meta">Signal feed · ranked by Breakout Score</p>
              <h2 id="feed-heading" className="mt-1 font-serif text-3xl font-medium tracking-[-0.015em]">
                What developers should be watching
              </h2>
            </div>
            <Link href="/signals?sort=recent" className="meta hover:text-accent">
              Sort by most recent →
            </Link>
          </header>
          <nav aria-label="Filter by topic" className="scroll-x -mx-4 mb-2 px-4">
            <ul className="flex w-max gap-2 pb-2">
              {TOPICS.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/signals?topic=${t.slug}`}
                    className="meta inline-flex h-7 items-center rounded-xs border border-rule px-2 text-ink-2 hover:border-ink hover:text-ink"
                  >
                    {t.short}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Suspense fallback={<LoadingState rows={5} />}>
            <HomeFeed />
          </Suspense>
        </div>
        <aside className="grid content-start gap-10 lg:sticky lg:top-20 lg:self-start" aria-label="Your radar and movers">
          <Suspense fallback={<RadarTeaserFallback />}>
            <RadarTeaser />
          </Suspense>
          <Suspense fallback={<LoadingState rows={2} label="Loading movers" />}>
            <TopMovers />
          </Suspense>
        </aside>
      </div>
    </section>
  )
}
