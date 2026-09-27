import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { SignalSummary } from '@/lib/domain/types'
import { CONFIDENCE_LABEL, TIME_TO_IMPACT_LABEL } from '@/lib/domain/labels'
import { formatRatio, topicName } from '@/lib/format'
import { ScoreBlock } from './SignalScore'
import { Sparkline } from './Sparkline'
import { DemoBadge, MetaSep, StatusBadge, VerifiedBadge } from './Badges'
import { RelativeTime } from './RelativeTime'
import { SaveSignalButton } from './SaveSignalButton'

const IMPACT_LABEL: Record<SignalSummary['developerImpact'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  unknown: 'Not assessed',
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="meta text-[10px]">{label}</dt>
      <dd className={`numeric truncate text-sm ${emphasis ? 'text-accent' : 'text-ink'}`}>{value}</dd>
    </div>
  )
}

/**
 * A signal as an information object: metadata rail, headline, one-line
 * rationale, and a compact metric strip. No card chrome — hierarchy comes
 * from type, rules and spacing.
 */
export function SignalCard({ signal, rank, headingLevel = 3 }: { signal: SignalSummary; rank?: number; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3'
  const href = `/signals/${signal.slug}`
  // Emphasis only when the evidence behind the spike is not low-confidence.
  const momentumUp = (signal.momentumRatio ?? 0) >= 2 && signal.confidence !== 'low'
  return (
    <article className="group grid grid-cols-[1fr_auto] gap-x-5 gap-y-3 py-6 sm:grid-cols-[5rem_1fr] sm:gap-x-6">
      {/* Score: right column on mobile (stays visible), left rail on larger screens */}
      <div className="col-start-2 row-start-1 sm:col-start-1 sm:row-span-2">
        <ScoreBlock score={signal.score} />
        {rank ? <span className="meta mt-2 hidden text-[10px] sm:block">#{String(rank).padStart(2, '0')}</span> : null}
      </div>

      <div className="col-start-1 row-start-1 min-w-0 sm:col-start-2">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/topics/${signal.primaryTopic}`} className="meta text-ink hover:text-accent">
            {topicName(signal.primaryTopic)}
          </Link>
          <MetaSep />
          <span className="meta">
            <RelativeTime iso={signal.updatedAt} />
          </span>
          <MetaSep />
          <StatusBadge status={signal.status} />
          {signal.verified ? <VerifiedBadge /> : null}
          {signal.isDemo ? <DemoBadge /> : null}
        </p>
        <H className="mt-2 max-w-3xl font-serif text-xl leading-snug font-medium tracking-[-0.01em] text-balance sm:text-2xl">
          <Link href={href} className="decoration-accent decoration-1 underline-offset-4 hover:underline">
            {signal.title}
          </Link>
        </H>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{signal.dek}</p>
      </div>

      <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2">
        <div className="flex items-end justify-between gap-6 border-t border-dashed border-rule pt-3">
          <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-2 xs:grid-cols-3 md:grid-cols-5">
            <Metric label="Momentum" value={signal.momentumRatio === null ? 'Insufficient' : `${momentumUp ? '↑ ' : ''}${formatRatio(signal.momentumRatio)}`} emphasis={momentumUp} />
            <Metric label="Dev impact" value={IMPACT_LABEL[signal.developerImpact]} />
            <Metric label="Evidence" value={`${signal.sourceCount} (${signal.independentSourceCount} ind.)`} />
            <Metric label="Confidence" value={CONFIDENCE_LABEL[signal.confidence].replace(' confidence', '')} />
            <Metric label="Time to impact" value={TIME_TO_IMPACT_LABEL[signal.timeToImpact]} />
          </dl>
          <Sparkline values={signal.sparkline} width={80} className="hidden shrink-0 sm:block" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Link href={`${href}#why-it-matters`} className="meta inline-flex items-center gap-1 text-ink hover:text-accent">
            Why this matters <ArrowRight aria-hidden className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <SaveSignalButton slug={signal.slug} title={signal.title} />
        </div>
      </div>
    </article>
  )
}
