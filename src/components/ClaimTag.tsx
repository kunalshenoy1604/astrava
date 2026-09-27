import type { ClaimKind } from '@/lib/domain/types'
import { CLAIM_DESCRIPTION, CLAIM_LABEL } from '@/lib/domain/labels'

const STYLE: Record<ClaimKind, string> = {
  fact: 'bg-ink text-paper border-ink',
  analysis: 'bg-transparent text-ink-2 border-ink-3',
  estimate: 'bg-transparent text-ink-2 border-ink-3 border-dashed',
}

/** FACT (solid) / ANALYSIS (outlined) / ESTIMATE (dashed). Shape, not only colour, carries the meaning. */
export function ClaimTag({ kind }: { kind: ClaimKind }) {
  return (
    <abbr
      title={CLAIM_DESCRIPTION[kind]}
      className={`inline-flex shrink-0 items-center rounded-xs border px-1 font-mono text-[10px] leading-4 uppercase tracking-[0.08em] no-underline ${STYLE[kind]}`}
    >
      {CLAIM_LABEL[kind]}
    </abbr>
  )
}
