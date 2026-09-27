import Link from 'next/link'
import type { SignalStatus } from '@/lib/domain/types'
import { STATUS_DESCRIPTION, STATUS_LABEL } from '@/lib/domain/labels'
import { topicName } from '@/lib/format'

export function TopicBadge({ slug, link = true }: { slug: string; link?: boolean }) {
  const label = topicName(slug)
  const cls = 'meta text-ink-2 hover:text-accent transition-colors'
  return link ? (
    <Link href={`/topics/${slug}`} className={cls}>
      {label}
    </Link>
  ) : (
    <span className={cls}>{label}</span>
  )
}

const STATUS_DOT: Record<SignalStatus, string> = {
  'early-signal': 'bg-accent',
  emerging: 'bg-accent',
  accelerating: 'bg-accent animate-pulse-signal',
  establishing: 'bg-positive',
  cooling: 'bg-ink-3',
  unconfirmed: 'border border-ink-3 bg-transparent',
}

export function StatusBadge({ status }: { status: SignalStatus }) {
  return (
    <span className="meta inline-flex items-center gap-1.5 text-ink-2" title={STATUS_DESCRIPTION[status]}>
      <span aria-hidden className={`inline-block size-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`meta inline-flex items-center rounded-xs border border-dashed border-caution px-1 text-caution ${className}`}
      title="Fictional demo data: placeholder sources and illustrative numbers."
    >
      Demo data
    </span>
  )
}

export function VerifiedBadge() {
  return (
    <span className="meta inline-flex items-center gap-1 text-positive" title="Reviewed by an analyst">
      <svg aria-hidden viewBox="0 0 12 12" className="size-3">
        <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      Reviewed
    </span>
  )
}

export function MetaSep() {
  return (
    <span aria-hidden className="meta text-rule">
      ·
    </span>
  )
}
