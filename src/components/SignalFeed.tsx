import type { SignalSummary } from '@/lib/domain/types'
import { SignalCard } from './SignalCard'
import { EmptyState } from './States'

export function SignalFeed({
  signals,
  ranked = false,
  empty,
  headingLevel = 3,
}: {
  signals: SignalSummary[]
  ranked?: boolean
  empty?: { title: string; body?: string; action?: { href: string; label: string } }
  headingLevel?: 2 | 3
}) {
  if (signals.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? 'No signals match these filters yet.'}
        body={empty?.body ?? 'Try a broader topic, or remove the status filter.'}
        action={empty?.action}
      />
    )
  }
  return (
    <ol className="divide-y divide-rule border-y border-rule">
      {signals.map((s, i) => (
        <li key={s.id} className={i > 8 ? '[content-visibility:auto] [contain-intrinsic-size:auto_260px]' : 'animate-rise'} style={i <= 8 ? { animationDelay: `${i * 30}ms` } : undefined}>
          <SignalCard signal={s} rank={ranked ? i + 1 : undefined} headingLevel={headingLevel} />
        </li>
      ))}
    </ol>
  )
}
