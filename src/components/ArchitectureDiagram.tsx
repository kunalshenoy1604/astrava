import type { Architecture, ArchitectureLayer } from '@/lib/domain/types'
import { InsufficientEvidence, StatementText } from './StatementList'

const ROLE_LABEL: Record<ArchitectureLayer['role'], string> = {
  changed: 'Changed',
  affected: 'Affected',
  context: 'Unchanged',
}

const ROLE_STYLE: Record<ArchitectureLayer['role'], string> = {
  changed: 'border-accent bg-accent-soft',
  affected: 'border-ink bg-paper-raised',
  context: 'border-dashed border-ink-3/60 bg-transparent text-ink-2',
}

/**
 * Layered stack diagram (user → … → infrastructure). Built from semantic HTML
 * (an ordered list), so it reads correctly without CSS and is extractable by
 * crawlers. On narrow screens it scrolls horizontally rather than squashing.
 */
export function ArchitectureDiagram({ architecture }: { architecture: Architecture | null }) {
  if (!architecture) return <InsufficientEvidence hint="No architecture has been documented for this signal." />
  return (
    <figure className="grid-paper rounded-sm border border-rule p-4 sm:p-6">
      <figcaption className="meta mb-4 text-ink-2">{architecture.caption}</figcaption>
      <div className="scroll-x -mx-1 px-1 pb-1">
        <ol className="min-w-[34rem]">
          {architecture.layers.map((layer, i) => (
            <li key={`${layer.id}-${i}`} className="relative">
              <div className="grid grid-cols-[7rem_1fr_6.5rem] items-stretch gap-3">
                <span className="meta self-center text-right">{layer.id.replace('-', ' ')}</span>
                <div className={`rounded-xs border px-3 py-2 ${ROLE_STYLE[layer.role]}`}>
                  <p className="text-sm font-medium">{layer.label}</p>
                  <p className="text-xs text-ink-2">{layer.detail}</p>
                </div>
                <span
                  className={`meta self-center text-[10px] ${layer.role === 'changed' ? 'text-accent' : layer.role === 'affected' ? 'text-ink' : 'text-ink-3'}`}
                >
                  {layer.role !== 'context' ? '← ' : ''}
                  {ROLE_LABEL[layer.role]}
                </span>
              </div>
              {i < architecture.layers.length - 1 ? (
                <div aria-hidden className="grid grid-cols-[7rem_1fr_6.5rem] gap-3">
                  <span />
                  <span className="flex h-5 justify-center">
                    <span className="relative w-px bg-ink-3">
                      <span className="absolute -bottom-px left-1/2 -translate-x-1/2 text-[9px] leading-none text-ink-3">▼</span>
                    </span>
                  </span>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
      {architecture.note ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-2">
          <StatementText statement={architecture.note} />
        </p>
      ) : null}
      <p className="meta mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
        <span>
          <span aria-hidden className="mr-1 inline-block size-2 border border-accent bg-accent-soft align-middle" />
          Where the change happens
        </span>
        <span>
          <span aria-hidden className="mr-1 inline-block size-2 border border-ink align-middle" />
          Affected downstream
        </span>
        <span>
          <span aria-hidden className="mr-1 inline-block size-2 border border-dashed border-ink-3 align-middle" />
          Unchanged context
        </span>
      </p>
    </figure>
  )
}
