import Link from 'next/link'
import { getFeed, settle } from '@/lib/data/queries'
import { formatRatio, topicName } from '@/lib/format'
import { ErrorState } from '../States'

/** Highest momentum ratios, independent of total score. */
export async function TopMovers() {
  const feed = await settle(getFeed({ sort: 'momentum', limit: 20 }))
  if (!feed.ok) return <ErrorState title="Movers could not load." />
  // Low-confidence signals are excluded: a spike from a handful of mentions is not momentum.
  const list = feed.value.filter((s) => s.momentumRatio !== null && s.confidence !== 'low').slice(0, 5)
  return (
    <section aria-labelledby="movers-heading">
      <h2 id="movers-heading" className="meta mb-3 border-b border-rule-strong pb-2 text-ink">
        Highest momentum
      </h2>
      {list.length === 0 ? (
        <p className="text-sm text-ink-2">Not enough activity history yet to compute momentum.</p>
      ) : (
        <ol className="divide-y divide-rule">
          {list.map((s) => (
            <li key={s.id} className="grid grid-cols-[3.5rem_1fr] gap-3 py-3">
              <span className="numeric text-lg text-accent">{formatRatio(s.momentumRatio)}</span>
              <span className="min-w-0">
                <Link href={`/signals/${s.slug}`} className="line-clamp-2 text-sm leading-snug font-medium hover:text-accent">
                  {s.title}
                </Link>
                <span className="meta mt-1 block text-[10px]">{topicName(s.primaryTopic)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 text-xs text-ink-3">Latest period ÷ trailing four-period mean. Low-confidence signals are excluded.</p>
    </section>
  )
}
