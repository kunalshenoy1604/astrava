import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { unstable_rethrow } from 'next/navigation'
import { getViewer } from '@/lib/auth/viewer'
import { getRadarTopics, getSavedSlugs } from '@/lib/personal/store'
import { getFeed, getSummaries, settle } from '@/lib/data/queries'
import { TOPICS, TOPIC_BY_SLUG } from '@/lib/demo/topics'
import { radarStats, RADAR_THRESHOLDS } from '@/lib/domain/summary'
import { isSupabaseConfigured } from '@/lib/config'
import { RadarSelector } from '@/components/RadarSelector'
import { SignalFeed } from '@/components/SignalFeed'
import { EmptyState, ErrorState, LoadingState } from '@/components/States'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Your radar',
  description: 'Choose the topics you work in and see only the signals that matter to you. Save signals to come back to them.',
  alternates: { canonical: '/radar' },
  robots: { index: false, follow: true },
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="border-t border-rule-strong pt-3">
      <dt className="meta">{label}</dt>
      <dd className="numeric mt-1 text-4xl font-medium">{value}</dd>
      {note ? <dd className="mt-1 text-xs text-ink-3">{note}</dd> : null}
    </div>
  )
}

async function UserRadar() {
  let viewer = null
  let topics: string[] = []
  let saved: string[] = []
  try {
    viewer = await getViewer()
    ;[topics, saved] = await Promise.all([getRadarTopics(viewer), getSavedSlugs(viewer)])
  } catch (err) {
    unstable_rethrow(err)
    return <ErrorState title="Your radar could not load." retryHref="/radar" />
  }
  const all = await settle(getFeed())
  if (!all.ok) return <ErrorState retryHref="/radar" />
  const counts = Object.fromEntries(TOPICS.map((t) => [t.slug, all.value.filter((s) => s.topics.includes(t.slug)).length]))
  const mine = topics.length ? all.value.filter((s) => s.topics.some((t) => topics.includes(t))) : []
  const stats = radarStats(mine)
  const savedSummaries = await settle(getSummaries(saved))

  return (
    <div className="grid gap-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <RadarSelector topics={TOPICS} selected={topics} counts={counts} />
        <p className="mt-6 text-xs leading-relaxed text-ink-3">
          {viewer
            ? `Saved to your account (${viewer.email ?? 'signed in'}).`
            : isSupabaseConfigured
              ? 'Stored in this browser. Sign in to keep your radar across devices — it will be merged into your account.'
              : 'Stored in this browser with a first-party cookie. Accounts are not enabled on this deployment.'}
        </p>
        {!viewer && isSupabaseConfigured ? (
          <Link href="/sign-up?next=/radar" className="btn-secondary mt-3 w-full">
            Create an account
          </Link>
        ) : null}
      </aside>

      <div className="min-w-0">
        <section aria-labelledby="radar-summary">
          <h2 id="radar-summary" className="meta text-ink">
            Your radar
          </h2>
          {topics.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Your radar is empty."
                body={
                  <>
                    Select topics on the left. A good start for most developers: <strong>AI infrastructure</strong> and{' '}
                    <strong>Developer tools</strong>.
                  </>
                }
              />
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-2">{topics.map((t) => TOPIC_BY_SLUG.get(t)?.name).join(' · ')}</p>
              <dl className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
                <Stat label="Signals" value={stats.total} note="Matching your topics" />
                <Stat label="High momentum" value={stats.highMomentum} note={`≥ ${RADAR_THRESHOLDS.highMomentum}× baseline`} />
                <Stat label="Early stage" value={stats.earlyStage} note="Early or unconfirmed" />
                <Stat label="Potentially significant" value={stats.potentiallySignificant} note={`Score ≥ ${RADAR_THRESHOLDS.significantScore}`} />
              </dl>
            </>
          )}
        </section>

        {topics.length ? (
          <section aria-labelledby="radar-feed" className="mt-12">
            <h2 id="radar-feed" className="mb-4 font-serif text-2xl font-medium">
              Signals on your radar
            </h2>
            <SignalFeed
              signals={mine}
              ranked
              empty={{
                title: 'No signals match this radar yet.',
                body: 'Try adding AI infrastructure or developer tooling.',
              }}
            />
          </section>
        ) : null}

        <section aria-labelledby="saved" className="mt-16">
          <h2 id="saved" className="mb-4 font-serif text-2xl font-medium">
            Saved signals
          </h2>
          {savedSummaries.ok ? (
            <SignalFeed
              signals={savedSummaries.value}
              empty={{
                title: 'Nothing saved yet.',
                body: 'Use “Save” on any signal to keep it here.',
                action: { href: '/signals', label: 'Browse signals' },
              }}
            />
          ) : (
            <ErrorState title="Saved signals could not load." />
          )}
        </section>
      </div>
    </div>
  )
}

export default function RadarPage() {
  return (
    <div className="mx-auto max-w-page px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Radar', href: '/radar' }]} />
      <header className="mt-6 mb-10 max-w-3xl">
        <h1 className="font-serif text-4xl font-medium tracking-[-0.02em] sm:text-5xl">Build your radar</h1>
        <p className="mt-3 text-lg text-ink-2">Pick the areas you work in. The feed below narrows to them, and the counts update as signals change.</p>
      </header>
      <Suspense fallback={<LoadingState rows={4} label="Loading your radar" />}>
        <UserRadar />
      </Suspense>
    </div>
  )
}
