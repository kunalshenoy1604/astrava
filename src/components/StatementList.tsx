import type { Statement } from '@/lib/domain/types'
import { ClaimTag } from './ClaimTag'
import { INSUFFICIENT } from '@/lib/domain/labels'

export function SourceRefs({ ids }: { ids?: string[] }) {
  if (!ids?.length) return null
  return (
    <span className="ml-1 whitespace-nowrap font-mono text-[11px] text-ink-3">
      {ids.map((id) => (
        <a key={id} href={`#src-${id}`} className="hover:text-accent" aria-label={`Source ${id.replace('s', '')}`}>
          [{id.replace('s', '')}]
        </a>
      ))}
    </span>
  )
}

export function StatementText({ statement }: { statement: Statement }) {
  return (
    <>
      <ClaimTag kind={statement.kind} /> <span>{statement.text}</span>
      <SourceRefs ids={statement.sourceIds} />
    </>
  )
}

/**
 * Renders statements with their FACT/ANALYSIS/ESTIMATE tag and source
 * references. Empty input renders "Insufficient evidence" instead of filler.
 */
export function StatementList({ statements, emptyHint, className = '' }: { statements: Statement[]; emptyHint?: string; className?: string }) {
  if (statements.length === 0) return <InsufficientEvidence hint={emptyHint} />
  return (
    <ul className={`space-y-3 ${className}`}>
      {statements.map((s, i) => (
        <li key={i} className="flex gap-2 leading-relaxed">
          <span className="block">
            <StatementText statement={s} />
          </span>
        </li>
      ))}
    </ul>
  )
}

export function InsufficientEvidence({ hint }: { hint?: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 border-l-2 border-dashed border-rule py-1 pl-3 text-sm text-ink-3">
      <span className="meta text-ink-2">{INSUFFICIENT}</span>
      {hint ? <span>{hint}</span> : null}
    </p>
  )
}
