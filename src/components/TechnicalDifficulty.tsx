import type { Difficulty, Stars } from '@/lib/domain/types'
import { STARS_LABEL } from '@/lib/domain/labels'
import { ClaimTag } from './ClaimTag'
import { InsufficientEvidence } from './StatementList'

export function StarMeter({ value, label }: { value: Stars; label: string }) {
  return (
    <span role="img" aria-label={`${label}: ${value} of 5`} className="font-mono tracking-[0.15em] whitespace-nowrap">
      <span className="text-ink">{'★'.repeat(value)}</span>
      <span className="text-rule">{'★'.repeat(5 - value)}</span>
    </span>
  )
}

const ROWS: [keyof Omit<Difficulty, 'overall' | 'rationale'>, string][] = [
  ['setup', 'Setup'],
  ['conceptual', 'Conceptual'],
  ['production', 'Production'],
  ['infrastructure', 'Infrastructure'],
]

export function TechnicalDifficulty({ difficulty }: { difficulty: Difficulty | null }) {
  if (!difficulty) return <InsufficientEvidence hint="Difficulty has not been estimated yet." />
  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:gap-10">
      <div>
        <p className="meta mb-1 flex items-center gap-2">
          Implementation difficulty <ClaimTag kind="estimate" />
        </p>
        <p className="text-2xl">
          <StarMeter value={difficulty.overall} label="Overall difficulty" />
        </p>
        <p className="mt-1 font-serif text-xl">{STARS_LABEL[difficulty.overall]}</p>
      </div>
      <div>
        <dl className="grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
          {ROWS.map(([key, label]) => (
            <div key={key} className="contents">
              <dt className="text-ink-2">{label}</dt>
              <dd>
                <StarMeter value={difficulty[key]} label={label} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 max-w-md text-xs leading-relaxed text-ink-3">
          {difficulty.rationale} Estimates for a typical application team, not absolute measures.
        </p>
      </div>
    </div>
  )
}
