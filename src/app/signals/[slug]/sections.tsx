import type { ReactNode } from 'react'
import type { Signal } from '@/lib/domain/types'
import { READINESS_LABEL } from '@/lib/domain/labels'
import { ClaimTag } from '@/components/ClaimTag'
import { InsufficientEvidence, SourceRefs, StatementList, StatementText } from '@/components/StatementList'

export const TOC: { id: string; label: string }[] = [
  { id: 'what-happened', label: 'What happened' },
  { id: 'why-it-matters', label: 'Why it matters' },
  { id: 'should-i-care', label: 'Should I care?' },
  { id: 'technical-change', label: 'Technical change' },
  { id: 'developer-impact', label: 'Developer impact' },
  { id: 'adoption', label: 'Adoption & momentum' },
  { id: 'limitations', label: 'Limitations & risks' },
  { id: 'competing', label: 'Competing approaches' },
  { id: 'builders', label: 'Who is building on it' },
  { id: 'evidence', label: 'Evidence & sources' },
  { id: 'score', label: 'How the score was calculated' },
  { id: 'related', label: 'Related signals' },
]

export function Section({ id, title, kicker, children }: { id: string; title: string; kicker?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 border-t border-rule pt-6 pb-12">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${id}-h`} className="font-serif text-2xl font-medium tracking-[-0.01em]">
          {title}
        </h2>
        {kicker ? <span className="meta">{kicker}</span> : null}
      </div>
      {children}
    </section>
  )
}

function CareCell({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="border-t border-rule-strong pt-3">
      <h3 className="meta mb-2 text-ink">{q}</h3>
      <div className="text-[15px]">{children}</div>
    </div>
  )
}

export function ShouldICare({ signal }: { signal: Signal }) {
  const sc = signal.shouldCare
  return (
    <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
      <CareCell q="What changed?">
        <StatementList statements={sc.whatChanged} />
      </CareCell>
      <CareCell q="Who is affected?">
        <StatementList statements={sc.whoIsAffected} emptyHint="Not yet assessed." />
      </CareCell>
      <CareCell q="What can developers do with it?">
        <StatementList statements={sc.whatCanDevelopersDo} emptyHint="Not yet assessed." />
      </CareCell>
      <CareCell q="Is it production-ready?">
        <p className="mb-2 font-serif text-xl">{READINESS_LABEL[sc.productionReadiness.level]}</p>
        <p className="leading-relaxed text-ink-2">
          <StatementText statement={sc.productionReadiness.statement} />
        </p>
      </CareCell>
      <CareCell q="What would make it important?">
        <StatementList statements={sc.whatWouldMakeItImportant} emptyHint="Not yet assessed." />
      </CareCell>
      <CareCell q="What could prevent adoption?">
        <StatementList statements={sc.whatCouldPreventAdoption} emptyHint="Not yet assessed." />
      </CareCell>
    </div>
  )
}

export function AdoptionTable({ signal }: { signal: Signal }) {
  if (signal.adoptionSignals.length === 0) return <InsufficientEvidence hint="No adoption indicators recorded." />
  return (
    <div className="scroll-x">
      <table className="w-full min-w-[28rem] text-sm">
        <caption className="sr-only">Adoption signals</caption>
        <thead>
          <tr className="meta text-left">
            <th scope="col" className="pb-2 font-normal">
              Indicator
            </th>
            <th scope="col" className="pb-2 font-normal">
              Value
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              Basis
            </th>
          </tr>
        </thead>
        <tbody>
          {signal.adoptionSignals.map((a, i) => (
            <tr key={i} className="rule-top">
              <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink-2">
                {a.label}
              </th>
              <td className="numeric py-2.5 pr-4">
                {a.value === null ? <span className="meta text-caution">Insufficient evidence</span> : a.value}
                {a.value !== null ? <SourceRefs ids={a.sourceIds} /> : null}
              </td>
              <td className="py-2.5 text-right">{a.value !== null ? <ClaimTag kind={a.kind} /> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {signal.isDemo ? <p className="meta mt-2 text-caution">Values are illustrative demo data.</p> : null}
    </div>
  )
}

const RELATION_LABEL = { alternative: 'Alternative', complement: 'Complement', incumbent: 'Incumbent' } as const

export function Competing({ signal }: { signal: Signal }) {
  if (signal.competingApproaches.length === 0) return <InsufficientEvidence hint="No competing approaches documented yet." />
  return (
    <dl className="divide-y divide-rule border-y border-rule">
      {signal.competingApproaches.map((c) => (
        <div key={c.name} className="grid gap-1 py-3 sm:grid-cols-[14rem_7rem_1fr] sm:gap-4">
          <dt className="font-medium">{c.name}</dt>
          <dd className="meta">{RELATION_LABEL[c.relation]}</dd>
          <dd className="text-sm leading-relaxed text-ink-2">
            <StatementText statement={c.note} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function Builders({ signal }: { signal: Signal }) {
  if (signal.builders.length === 0)
    return <InsufficientEvidence hint="No independent projects or organisations are documented as building on this yet." />
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {signal.builders.map((b) => (
        <li key={b.name} className="border-l-2 border-ink pl-3">
          <p className="font-medium">{b.name}</p>
          <p className="meta text-[10px]">{b.kind.replace('-', ' ')}</p>
          <p className="mt-1 text-sm text-ink-2">
            <StatementText statement={b.note} />
          </p>
        </li>
      ))}
    </ul>
  )
}
