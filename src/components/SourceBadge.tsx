import type { SourceKind, SourceTier } from '@/lib/domain/types'
import { SOURCE_KIND_LABEL, SOURCE_TIER_LABEL } from '@/lib/domain/labels'

const TIER_STYLE: Record<SourceTier, string> = {
  primary: 'border-ink text-ink',
  secondary: 'border-ink-3 text-ink-2',
  community: 'border-dashed border-ink-3 text-ink-3',
}

export function SourceKindBadge({ kind }: { kind: SourceKind }) {
  return <span className="meta whitespace-nowrap text-ink-2">{SOURCE_KIND_LABEL[kind]}</span>
}

export function SourceTierBadge({ tier }: { tier: SourceTier }) {
  return (
    <span className={`meta inline-flex items-center rounded-xs border px-1 whitespace-nowrap ${TIER_STYLE[tier]}`}>{SOURCE_TIER_LABEL[tier]}</span>
  )
}
