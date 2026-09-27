import Link from 'next/link'
import { unstable_rethrow } from 'next/navigation'
import { getViewer } from '@/lib/auth/viewer'
import { getRadarTopics } from '@/lib/personal/store'
import { getFeed, settle } from '@/lib/data/queries'
import { radarStats, RADAR_THRESHOLDS } from '@/lib/domain/summary'
import { topicName } from '@/lib/format'

export function RadarTeaserFallback() {
  return (
    <section aria-label="Your radar" className="rounded-sm border border-rule p-4">
      <p className="meta text-ink">Your radar</p>
      <p className="mt-2 h-10 animate-pulse bg-paper-sunken" />
    </section>
  )
}

/** Personal: reads the radar from the account or this browser's cookie. */
export async function RadarTeaser() {
  let topics: string[] = []
  try {
    topics = await getRadarTopics(await getViewer())
  } catch (err) {
    unstable_rethrow(err)
    topics = []
  }
  if (topics.length === 0) {
    return (
      <section aria-labelledby="radar-teaser" className="rounded-sm border border-rule-strong p-4">
        <h2 id="radar-teaser" className="meta text-ink">
          Your radar
        </h2>
        <p className="mt-2 font-serif text-lg leading-snug">Filter the feed down to the areas you work in.</p>
        <p className="mt-1 text-sm text-ink-2">Pick topics once. No account needed — it is stored in this browser until you sign in.</p>
        <Link href="/radar" className="btn-primary mt-4 w-full">
          Build my radar
        </Link>
      </section>
    )
  }
  const feed = await settle(getFeed({ topics }))
  const stats = feed.ok ? radarStats(feed.value) : null
  return (
    <section aria-labelledby="radar-teaser" className="rounded-sm border border-rule-strong p-4">
      <h2 id="radar-teaser" className="meta text-ink">
        Your radar
      </h2>
      <p className="mt-1 text-xs text-ink-3">{topics.map(topicName).join(' · ')}</p>
      {stats ? (
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <dt className="meta text-[10px]">Signals</dt>
            <dd className="numeric text-2xl">{stats.total}</dd>
          </div>
          <div>
            <dt className="meta text-[10px]">High momentum</dt>
            <dd className="numeric text-2xl">{stats.highMomentum}</dd>
          </div>
          <div>
            <dt className="meta text-[10px]">Early stage</dt>
            <dd className="numeric text-2xl">{stats.earlyStage}</dd>
          </div>
          <div>
            <dt className="meta text-[10px]">Score ≥ {RADAR_THRESHOLDS.significantScore}</dt>
            <dd className="numeric text-2xl">{stats.potentiallySignificant}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-2 text-sm text-negative">Radar data could not load.</p>
      )}
      <Link href="/radar" className="btn-secondary mt-4 w-full">
        Open radar
      </Link>
    </section>
  )
}
