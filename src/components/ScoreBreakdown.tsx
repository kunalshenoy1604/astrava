import type { BreakoutScore, FactorResult } from '@/lib/domain/types'
import { CONFIDENCE_LABEL } from '@/lib/domain/labels'
import { formatPoints } from '@/lib/format'

const BASIS_LABEL: Record<FactorResult['basis'], string> = {
  assessed: 'Analysis',
  measured: 'Measured',
  estimate: 'Estimate',
}

function Bar({ value, max, negative = false }: { value: number; max: number; negative?: boolean }) {
  const pct = Math.max(0, Math.min(100, (Math.abs(value) / max) * 100))
  return (
    <span aria-hidden className="relative block h-1.5 w-full bg-paper-sunken">
      <span
        className={`absolute inset-y-0 left-0 origin-left animate-fill-bar ${negative ? 'bg-negative' : 'bg-ink'}`}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}

/**
 * Full, explainable breakdown. Each row states whether the points come from
 * an analyst rubric, a measurement, or an estimate, and why.
 */
export function ScoreBreakdown({ score, compact = false }: { score: BreakoutScore; compact?: boolean }) {
  return (
    <div className="text-sm">
      <table className="w-full border-collapse">
        <caption className="sr-only">Breakout Score factors</caption>
        <thead>
          <tr className="meta text-left">
            <th scope="col" className="py-2 pr-3 font-normal">
              Factor
            </th>
            <th scope="col" className="hidden w-[30%] py-2 pr-3 font-normal sm:table-cell">
              <span className="sr-only">Share of maximum</span>
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              Points
            </th>
          </tr>
        </thead>
        <tbody>
          {score.factors.map((f) => (
            <tr key={f.id} className="rule-top align-top">
              <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-ink">{f.label}</span>
                  <span className="meta text-[10px]">{BASIS_LABEL[f.basis]}</span>
                  {f.insufficient ? <span className="meta text-[10px] text-caution">Insufficient evidence</span> : null}
                </span>
                {!compact ? <span className="mt-1 block text-xs leading-relaxed text-ink-3">{f.explanation}</span> : null}
              </th>
              <td className="hidden py-3.5 pr-3 sm:table-cell">
                <Bar value={f.points} max={f.max} />
              </td>
              <td className="numeric py-2.5 text-right whitespace-nowrap">
                {formatPoints(f.points)}
                <span className="text-ink-3">/{f.max}</span>
              </td>
            </tr>
          ))}
          <tr className="rule-top align-top">
            <th scope="row" className="py-2.5 pr-3 text-left font-normal">
              <span className="font-medium text-ink">Hype penalty</span>
              {!compact ? (
                <span className="mt-1 block text-xs leading-relaxed text-ink-3">
                  {score.hypePenalty.reasons.length ? score.hypePenalty.reasons.join(' ') : 'No hype indicators detected.'}
                </span>
              ) : null}
            </th>
            <td className="hidden py-3.5 pr-3 sm:table-cell">
              <Bar value={score.hypePenalty.points} max={15} negative />
            </td>
            <td className={`numeric py-2.5 text-right ${score.hypePenalty.points < 0 ? 'text-negative' : ''}`}>
              {score.hypePenalty.points === 0 ? '0' : score.hypePenalty.points}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="rule-strong">
            <th scope="row" className="py-2.5 text-left font-medium">
              Breakout Score
            </th>
            <td className="hidden sm:table-cell" />
            <td className="numeric py-2.5 text-right text-lg font-medium">{score.total}</td>
          </tr>
        </tfoot>
      </table>
      <div className="mt-4 grid gap-1 border-l-2 border-rule pl-3 text-xs text-ink-2">
        <p>
          <span className="font-medium text-ink">{CONFIDENCE_LABEL[score.confidence.level]}</span>{' '}
          <span className="numeric text-ink-3">({score.confidence.value.toFixed(2)})</span> — {score.confidence.reasons.join(' ')}
        </p>
        <p className="text-ink-3">
          An analytical ranking derived from observable signals using model {score.modelVersion}. It is not a prediction and not a
          measure of quality. <a className="link" href="/methodology#breakout-score">How it works</a>
        </p>
      </div>
    </div>
  )
}

/** Collapsible “Why 87?” — native <details>, so the breakdown is in the HTML and works without JavaScript. */
export function WhyScore({ score, compact = true }: { score: BreakoutScore; compact?: boolean }) {
  return (
    <details className="group">
      <summary className="meta inline-flex items-center gap-1 text-ink hover:text-accent">
        <span className="transition-transform group-open:rotate-90" aria-hidden>
          ▸
        </span>
        Why {score.total}?
      </summary>
      <div className="mt-3">
        <ScoreBreakdown score={score} compact={compact} />
      </div>
    </details>
  )
}
