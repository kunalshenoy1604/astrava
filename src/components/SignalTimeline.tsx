import type { TimelineEvent } from '@/lib/domain/types'
import { formatDate } from '@/lib/format'
import { SourceRefs } from './StatementList'
import { InsufficientEvidence } from './StatementList'

const KIND_LABEL: Record<TimelineEvent['kind'], string> = {
  'first-seen': 'First seen',
  release: 'Release',
  paper: 'Paper',
  integration: 'Integration',
  benchmark: 'Benchmark',
  discussion: 'Discussion',
  incident: 'Incident',
}

export function SignalTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <InsufficientEvidence hint="No dated events recorded." />
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))
  return (
    <ol className="relative ml-1 border-l border-rule">
      {sorted.map((e, i) => {
        const latest = i === sorted.length - 1
        return (
          <li key={`${e.date}-${i}`} className="relative grid gap-0.5 pb-5 pl-5 last:pb-0 sm:grid-cols-[7.5rem_1fr] sm:gap-4">
            <span
              aria-hidden
              className={`absolute top-1.5 -left-[4.5px] size-2 rounded-full border ${latest ? 'border-accent bg-accent' : 'border-ink-3 bg-paper'}`}
            />
            <time dateTime={e.date} className="meta pt-0.5 text-ink-2">
              {formatDate(e.date)}
            </time>
            <p className="text-sm leading-relaxed">
              <span className="meta mr-2 text-[10px]">{KIND_LABEL[e.kind]}</span>
              {e.label}
              <SourceRefs ids={e.sourceIds} />
            </p>
          </li>
        )
      })}
    </ol>
  )
}
