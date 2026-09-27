import Link from 'next/link'
import { getRelatedSignals, settle } from '@/lib/data/queries'
import { formatRatio, topicName } from '@/lib/format'
import { ScoreTicks } from './SignalScore'
import { ErrorState } from './States'
import { InsufficientEvidence } from './StatementList'

/** Signals sharing a topic, ranked by score — internal links that form topic clusters. */
export async function RelatedSignals({ slug, topics }: { slug: string; topics: string[] }) {
  const res = await settle(getRelatedSignals(slug, topics))
  if (!res.ok) return <ErrorState title="Related signals could not load." />
  if (res.value.length === 0) return <InsufficientEvidence hint="No other signals share these topics yet." />
  return (
    <ul className="grid gap-x-8 sm:grid-cols-2">
      {res.value.map((s) => (
        <li key={s.id} className="border-t border-rule py-4">
          <p className="meta flex items-center justify-between">
            <span>{topicName(s.primaryTopic)}</span>
            <span className="numeric text-ink">{s.score}</span>
          </p>
          <Link href={`/signals/${s.slug}`} className="mt-1 block font-serif text-lg leading-snug hover:text-accent">
            {s.title}
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <ScoreTicks score={s.score} />
            <span className="meta text-[10px]">Momentum {formatRatio(s.momentumRatio)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
