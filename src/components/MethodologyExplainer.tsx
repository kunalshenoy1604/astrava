import Link from 'next/link'
import { FACTOR_LABELS, FACTOR_WEIGHTS } from '@/lib/scoring/model'
import { HYPE_PENALTY_CAP } from '@/lib/scoring/hype'
import type { FactorId } from '@/lib/domain/types'

const BASIS: Record<FactorId, 'Analysis' | 'Measured' | 'Estimate'> = {
  novelty: 'Analysis',
  technicalSignificance: 'Analysis',
  developerRelevance: 'Analysis',
  adoptionVelocity: 'Measured',
  communityMomentum: 'Measured',
  sourceCredibility: 'Measured',
  crossSourceConfirmation: 'Measured',
  evidenceStrength: 'Measured',
  timeToImpact: 'Estimate',
}

/** The score's composition, drawn to scale from the same constants the scoring code uses. */
export function MethodologyExplainer({ headingLevel = 2, contained = true }: { headingLevel?: 2 | 3; contained?: boolean }) {
  const H = headingLevel === 2 ? 'h2' : 'h3'
  const factors = Object.entries(FACTOR_WEIGHTS) as [FactorId, number][]
  return (
    <section aria-labelledby="score-explainer" className={contained ? 'mx-auto max-w-page px-4 pt-20 sm:px-6' : 'pt-20'}>
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <p className="meta">Methodology</p>
          <H id="score-explainer" className="mt-1 font-serif text-3xl font-medium tracking-[-0.015em]">
            How the Breakout Score is built
          </H>
          <p className="mt-4 text-ink-2">
            Nine factors add up to 100. Three are analyst judgements, five are measured from stored sources and time series, one is
            an estimate. A hype penalty of up to −{HYPE_PENALTY_CAP} is subtracted when attention runs ahead of evidence.
          </p>
          <Link href="/methodology#breakout-score" className="link mt-4 inline-block text-sm">
            Read the full methodology
          </Link>
        </div>
        <div>
          <div className="flex h-10 w-full overflow-hidden rounded-xs border border-rule-strong" role="img" aria-label="Score weights drawn to scale">
            {factors.map(([id, w]) => (
              <span
                key={id}
                style={{ width: `${w}%` }}
                className={`border-r border-paper last:border-r-0 ${BASIS[id] === 'Analysis' ? 'bg-ink' : BASIS[id] === 'Measured' ? 'bg-ink-3' : 'bg-accent'}`}
                title={`${FACTOR_LABELS[id]}: ${w}`}
              />
            ))}
          </div>
          <table className="mt-4 w-full text-sm">
            <caption className="sr-only">Breakout Score weights</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Factor</th>
                <th scope="col">Basis</th>
                <th scope="col">Maximum points</th>
              </tr>
            </thead>
            <tbody className="grid gap-x-8 sm:grid-cols-2">
              {factors.map(([id, w]) => (
                <tr key={id} className="flex items-baseline justify-between gap-3 border-b border-rule py-1.5">
                  <th scope="row" className="flex items-center gap-2 text-left font-normal">
                    <span
                      aria-hidden
                      className={`inline-block size-2 ${BASIS[id] === 'Analysis' ? 'bg-ink' : BASIS[id] === 'Measured' ? 'bg-ink-3' : 'bg-accent'}`}
                    />
                    {FACTOR_LABELS[id]}
                  </th>
                  <td className="meta ml-auto text-[10px]">{BASIS[id]}</td>
                  <td className="numeric w-8 text-right">{w}</td>
                </tr>
              ))}
              <tr className="flex items-baseline justify-between gap-3 border-b border-rule py-1.5">
                <th scope="row" className="flex items-center gap-2 text-left font-normal">
                  <span aria-hidden className="inline-block size-2 border border-negative" />
                  Hype penalty
                </th>
                <td className="meta ml-auto text-[10px]">Measured + flags</td>
                <td className="numeric w-8 text-right text-negative">−{HYPE_PENALTY_CAP}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
